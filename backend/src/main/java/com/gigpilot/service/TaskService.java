package com.gigpilot.service;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.gigpilot.dto.Dtos.AcceptResponse;
import com.gigpilot.dto.Dtos.CancelRequest;
import com.gigpilot.dto.Dtos.RevisionRequest;
import com.gigpilot.dto.Dtos.SubmitRequest;
import com.gigpilot.dto.Dtos.TaskRequest;
import com.gigpilot.dto.Dtos.TaskSearch;
import com.gigpilot.dto.Dtos.TaskView;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.FileAsset;
import com.gigpilot.model.FileKind;
import com.gigpilot.model.NotificationType;
import com.gigpilot.model.ProposalStatus;
import com.gigpilot.model.Role;
import com.gigpilot.model.Task;
import com.gigpilot.model.TaskStatus;
import com.gigpilot.model.User;
import com.gigpilot.repository.FavoriteRepository;
import com.gigpilot.repository.ProposalRepository;
import com.gigpilot.repository.TaskRepository;
import com.gigpilot.repository.UserRepository;
import com.gigpilot.security.AuthUser;
import com.gigpilot.util.Texts;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.geo.Circle;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.Metrics;
import org.springframework.data.geo.Point;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.geo.GeoJsonPoint;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class TaskService {
    private static final double DEFAULT_RADIUS_KM = 25;

    private final TaskRepository tasks;
    private final UserRepository users;
    private final ProposalRepository proposals;
    private final FavoriteRepository favorites;
    private final MongoTemplate mongo;
    private final ViewMapper mapper;
    private final TaskLookup lookup;
    private final FileService files;
    private final NotificationService notifications;
    private final ProposalMaintenance proposalMaintenance;
    private final BlockService blocks;
    private final AuditService audit;

    // ------------------------------------------------------------------ create / edit / delete

    public TaskView create(AuthUser user, TaskRequest req) {
        if (user.role() != Role.employer) {
            throw ApiException.forbidden("Only employers can post tasks");
        }
        validateDeadline(req.deadline());
        GeoJsonPoint geo = geoPoint(req.latitude(), req.longitude());
        List<FileAsset> attachments = files.claim(user.id(), req.attachmentIds());

        Task task = new Task();
        applyFields(task, req, geo);
        task.setStatus(TaskStatus.open);
        task.setEmployer(user.id());
        tasks.save(task);

        files.link(attachments, task.getId(), FileKind.attachment);
        task.setAttachments(attachments.stream().map(FileAsset::getId).toList());
        return mapper.task(tasks.save(task));
    }

    public TaskView update(AuthUser user, String id, TaskRequest req) {
        Task task = lookup.require(id);
        requireEmployer(user, task);
        if (task.getStatus() != TaskStatus.open) {
            throw ApiException.badRequest("Only open tasks can be edited");
        }
        validateDeadline(req.deadline());
        applyFields(task, req, geoPoint(req.latitude(), req.longitude()));

        if (req.attachmentIds() != null) {
            List<String> wanted = req.attachmentIds().stream().distinct().toList();
            Set<String> current = new HashSet<>(task.getAttachments());
            List<String> added = wanted.stream().filter(f -> !current.contains(f)).toList();
            List<String> removed = current.stream().filter(f -> !wanted.contains(f)).toList();
            if (wanted.size() > FileService.MAX_FILES_PER_LIST) {
                throw ApiException.badRequest("Too many files (max " + FileService.MAX_FILES_PER_LIST + ")");
            }
            List<FileAsset> claimed = files.claim(user.id(), added);
            files.link(claimed, task.getId(), FileKind.attachment);
            files.delete(removed);
            task.setAttachments(new ArrayList<>(wanted));
        }
        return mapper.task(tasks.save(task));
    }

    public void delete(AuthUser user, String id) {
        Task task = lookup.require(id);
        requireEmployer(user, task);
        if (task.getStatus() != TaskStatus.open) {
            throw ApiException.badRequest("Only open tasks can be deleted; cancel the task instead");
        }
        proposalMaintenance.closePending(task, null, NotificationType.task_cancelled,
                "The task \"" + task.getTitle() + "\" was removed by the employer");
        proposals.deleteByTask(id);
        favorites.deleteByTask(id);
        files.deleteForTask(id);
        tasks.delete(task);
        audit.log(user.id(), "task.delete", "task", id, task.getTitle());
    }

    // ------------------------------------------------------------------ reading

    public TaskView get(AuthUser user, String id) {
        Task task = lookup.require(id);
        if (task.isHidden() && !TaskLookup.isParticipant(user, task) && user.role() != Role.admin) {
            throw ApiException.notFound("Task not found");
        }
        return mapper.task(task);
    }

    /** Sorting options for task lists: newest (default), oldest, price_asc, price_desc, deadline. */
    public static Sort sortFor(String sort) {
        if (sort == null) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        return switch (sort) {
            case "oldest" -> Sort.by(Sort.Direction.ASC, "createdAt");
            case "price_asc" -> Sort.by(Sort.Direction.ASC, "price");
            case "price_desc" -> Sort.by(Sort.Direction.DESC, "price");
            case "deadline" -> Sort.by(Sort.Direction.ASC, "deadline");
            default -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }

    /**
     * Open, visible, non-expired tasks matching the filters. Free-text filters are quoted so they cannot act
     * as regexes.
     */
    public Page<TaskView> search(TaskSearch f, Pageable pageable) {
        List<Criteria> all = new ArrayList<>();
        all.add(where("status").is(TaskStatus.open.name()));
        all.add(where("hidden").ne(true));
        all.add(new Criteria().orOperator(where("deadline").is(null), where("deadline").gt(Instant.now())));

        if (StringUtils.hasText(f.location())) {
            all.add(where("location").regex(Pattern.quote(f.location().trim()), "i"));
        }
        if (StringUtils.hasText(f.category())) {
            all.add(where("category").regex("^" + Pattern.quote(f.category().trim()) + "$", "i"));
        }
        List<String> skills = Texts.cleanList(f.skills(), 15, 40);
        if (!skills.isEmpty()) {
            all.add(where("skills").in(skills.stream()
                    .map(s -> Pattern.compile("^" + Pattern.quote(s) + "$", Pattern.CASE_INSENSITIVE))
                    .toList()));
        }
        if (StringUtils.hasText(f.q())) {
            String quoted = Pattern.quote(f.q().trim());
            all.add(new Criteria().orOperator(
                    where("title").regex(quoted, "i"),
                    where("description").regex(quoted, "i"),
                    where("category").regex(quoted, "i"),
                    where("skills").regex(quoted, "i")));
        }
        if (f.minPrice() != null || f.maxPrice() != null) {
            Criteria price = where("price");
            if (f.minPrice() != null) price = price.gte(f.minPrice());
            if (f.maxPrice() != null) price = price.lte(f.maxPrice());
            all.add(price);
        }
        if (f.latitude() != null || f.longitude() != null) {
            if (f.latitude() == null || f.longitude() == null) {
                throw ApiException.badRequest("Both latitude and longitude are required for a location search");
            }
            double radius = f.radiusKm() == null ? DEFAULT_RADIUS_KM : f.radiusKm();
            all.add(where("geo").withinSphere(
                    new Circle(new Point(f.longitude(), f.latitude()), new Distance(radius, Metrics.KILOMETERS))));
        }
        return page(query(new Criteria().andOperator(all.toArray(new Criteria[0]))), pageable);
    }

    /** The employer's own tasks, optionally filtered by status. */
    public Page<TaskView> posted(AuthUser user, TaskStatus status, Pageable pageable) {
        if (user.role() != Role.employer) {
            throw ApiException.forbidden("Access denied");
        }
        return page(query(mine("employer", user.id(), status)), pageable);
    }

    /** Tasks assigned to the freelancer, optionally filtered by status. */
    public Page<TaskView> assigned(AuthUser user, TaskStatus status, Pageable pageable) {
        if (user.role() != Role.freelancer) {
            throw ApiException.forbidden("Access denied");
        }
        return page(query(mine("freelancer", user.id(), status)), pageable);
    }

    // ------------------------------------------------------------------ assignment

    /** Instant accept at the posted budget. The status check and update are one atomic operation. */
    public AcceptResponse accept(AuthUser user, String id) {
        if (user.role() != Role.freelancer) {
            throw ApiException.forbidden("Only freelancers can accept tasks");
        }
        Task existing = lookup.require(id);
        if (existing.isHidden()) {
            throw ApiException.notFound("Task not found");
        }
        if (blocks.isBlocked(user.id(), existing.getEmployer())) {
            throw ApiException.forbidden("You cannot accept this task");
        }
        requireAvailable(existing);

        Task task = assign(id, user.id(), existing.getPrice());
        if (task == null) {
            throw ApiException.badRequest("Task already assigned");
        }
        proposals.findByTaskAndFreelancer(id, user.id())
                .filter(p -> p.getStatus() == ProposalStatus.pending)
                .ifPresent(p -> {
                    p.setStatus(ProposalStatus.accepted);
                    proposals.save(p);
                });
        proposalMaintenance.closePending(task, null, NotificationType.proposal_rejected,
                "The task \"" + task.getTitle() + "\" has been taken by another freelancer");
        notifications.notify(task.getEmployer(), NotificationType.task_accepted,
                nameOf(user.id()) + " accepted your task \"" + task.getTitle() + "\"", id);
        return new AcceptResponse("Task accepted", mapper.task(task));
    }

    /** Atomically assigns an open task. Returns null when it was no longer open. */
    public Task assign(String taskId, String freelancerId, Double agreedPrice) {
        return mongo.findAndModify(
                query(where("_id").is(new ObjectId(taskId))
                        .and("status").is(TaskStatus.open.name())
                        .and("hidden").ne(true)),
                new Update()
                        .set("status", TaskStatus.assigned.name())
                        .set("freelancer", new ObjectId(freelancerId))
                        .set("agreedPrice", agreedPrice)
                        .set("updatedAt", Instant.now()),
                FindAndModifyOptions.options().returnNew(true),
                Task.class);
    }

    /** The assigned freelancer drops out; the task goes back to the open pool. */
    public TaskView withdraw(AuthUser user, String id) {
        Task task = lookup.require(id);
        if (!TaskLookup.isAssignee(user, task)) {
            throw ApiException.forbidden("Only the assigned freelancer can withdraw");
        }
        if (task.getStatus() != TaskStatus.assigned) {
            throw ApiException.badRequest("You can only withdraw from a task that is in progress");
        }
        proposalMaintenance.withdrawAccepted(id, user.id());
        task.setStatus(TaskStatus.open);
        task.setFreelancer(null);
        task.setAgreedPrice(null);
        task.setRevisionNote(null);
        task.setSubmissionNote(null);
        tasks.save(task);
        notifications.notify(task.getEmployer(), NotificationType.task_withdrawn,
                nameOf(user.id()) + " withdrew from your task \"" + task.getTitle() + "\"; it is open again", id);
        audit.log(user.id(), "task.withdraw", "task", id, null);
        return mapper.task(task);
    }

    // ------------------------------------------------------------------ delivery & review

    /**
     * Legacy one-step completion by the freelancer (no employer review). Prefer
     * {@link #submit} + {@link #approve}.
     */
    @CacheEvict(cacheNames = "publicProfiles", allEntries = true)
    public void complete(AuthUser user, String id) {
        Task task = lookup.require(id);
        if (task.getStatus() != TaskStatus.assigned) {
            throw ApiException.badRequest("Task is not assigned yet");
        }
        if (!TaskLookup.isAssignee(user, task)) {
            throw ApiException.forbidden("Only assigned freelancer can mark this task complete");
        }
        task.setStatus(TaskStatus.completed);
        task.setCompletedAt(Instant.now());
        tasks.save(task);
        notifications.notify(task.getEmployer(), NotificationType.task_completed,
                "\"" + task.getTitle() + "\" was marked as completed", id);
    }

    /** The freelancer hands in the work for the employer to review. */
    public TaskView submit(AuthUser user, String id, SubmitRequest req) {
        Task task = lookup.require(id);
        if (!TaskLookup.isAssignee(user, task)) {
            throw ApiException.forbidden("Only the assigned freelancer can submit work");
        }
        if (task.getStatus() != TaskStatus.assigned) {
            throw ApiException.badRequest("Task is not in progress");
        }
        List<FileAsset> deliverables = req == null ? List.of() : files.claim(user.id(), req.attachmentIds());
        files.link(deliverables, id, FileKind.deliverable);

        List<String> all = new ArrayList<>(task.getDeliverables());
        deliverables.forEach(d -> all.add(d.getId()));
        if (all.size() > FileService.MAX_FILES_PER_LIST) {
            throw ApiException.badRequest("Too many deliverables (max " + FileService.MAX_FILES_PER_LIST + ")");
        }
        task.setDeliverables(all);
        task.setSubmissionNote(req == null ? null : Texts.trimToNull(req.note()));
        task.setRevisionNote(null);
        task.setStatus(TaskStatus.submitted);
        task.setSubmittedAt(Instant.now());
        tasks.save(task);
        notifications.notify(task.getEmployer(), NotificationType.task_submitted,
                nameOf(user.id()) + " submitted work for \"" + task.getTitle() + "\"", id);
        return mapper.task(task);
    }

    public TaskView requestRevision(AuthUser user, String id, RevisionRequest req) {
        Task task = lookup.require(id);
        requireEmployer(user, task);
        if (task.getStatus() != TaskStatus.submitted) {
            throw ApiException.badRequest("There is no submitted work to review");
        }
        task.setStatus(TaskStatus.assigned);
        task.setRevisionNote(req.note().trim());
        tasks.save(task);
        notifications.notify(task.getFreelancer(), NotificationType.revision_requested,
                "Changes requested on \"" + task.getTitle() + "\"", id);
        return mapper.task(task);
    }

    @CacheEvict(cacheNames = "publicProfiles", allEntries = true)
    public TaskView approve(AuthUser user, String id) {
        Task task = lookup.require(id);
        requireEmployer(user, task);
        if (task.getStatus() != TaskStatus.submitted) {
            throw ApiException.badRequest("There is no submitted work to approve");
        }
        task.setStatus(TaskStatus.completed);
        task.setCompletedAt(Instant.now());
        tasks.save(task);
        notifications.notify(task.getFreelancer(), NotificationType.task_completed,
                "\"" + task.getTitle() + "\" was approved. Nice work!", id);
        audit.log(user.id(), "task.approve", "task", id, null);
        return mapper.task(task);
    }

    public TaskView cancel(AuthUser user, String id, CancelRequest req) {
        Task task = lookup.require(id);
        requireEmployer(user, task);
        TaskStatus s = task.getStatus();
        if (s != TaskStatus.open && s != TaskStatus.assigned && s != TaskStatus.submitted) {
            throw ApiException.badRequest("This task can no longer be cancelled");
        }
        task.setStatus(TaskStatus.cancelled);
        task.setCancelReason(req == null ? null : Texts.trimToNull(req.reason()));
        tasks.save(task);

        proposalMaintenance.closePending(task, null, NotificationType.task_cancelled,
                "The task \"" + task.getTitle() + "\" was cancelled");
        notifications.notify(task.getFreelancer(), NotificationType.task_cancelled,
                "The task \"" + task.getTitle() + "\" was cancelled by the employer", id);
        audit.log(user.id(), "task.cancel", "task", id, task.getCancelReason());
        return mapper.task(task);
    }

    // ------------------------------------------------------------------ housekeeping

    /** Marks open tasks whose deadline has passed as expired. Returns how many were expired. */
    public int expireOverdue() {
        Instant now = Instant.now();
        List<Task> due = mongo.find(
                query(where("status").is(TaskStatus.open.name()).and("deadline").lt(now)).limit(500), Task.class);
        if (due.isEmpty()) {
            return 0;
        }
        mongo.updateMulti(
                query(where("_id").in(due.stream().map(t -> new ObjectId(t.getId())).toList())),
                new Update().set("status", TaskStatus.expired.name()).set("updatedAt", now),
                Task.class);
        for (Task task : due) {
            proposalMaintenance.closePending(task, null, NotificationType.task_expired,
                    "The task \"" + task.getTitle() + "\" has expired");
            notifications.notify(task.getEmployer(), NotificationType.task_expired,
                    "Your task \"" + task.getTitle() + "\" passed its deadline and has expired", task.getId());
        }
        return due.size();
    }

    // ------------------------------------------------------------------ helpers

    private Criteria mine(String field, String userId, TaskStatus status) {
        Criteria c = where(field).is(new ObjectId(userId));
        return status == null ? c : c.and("status").is(status.name());
    }

    private Page<TaskView> page(Query q, Pageable pageable) {
        long total = mongo.count(Query.of(q), Task.class);
        List<Task> content = mongo.find(Query.of(q).with(pageable), Task.class);
        return new PageImpl<>(mapper.tasks(content), pageable, total);
    }

    private void applyFields(Task task, TaskRequest req, GeoJsonPoint geo) {
        task.setTitle(req.title().trim());
        task.setDescription(req.description().trim());
        task.setPrice(req.price());
        task.setLocation(Texts.trimToNull(req.location()));
        task.setCategory(Texts.trimToNull(req.category()));
        task.setSkills(Texts.cleanList(req.skills(), 15, 40));
        task.setDeadline(req.deadline());
        task.setGeo(geo);
    }

    private static void validateDeadline(Instant deadline) {
        if (deadline != null && deadline.isBefore(Instant.now())) {
            throw ApiException.badRequest("Deadline must be in the future");
        }
    }

    private static GeoJsonPoint geoPoint(Double latitude, Double longitude) {
        if (latitude == null && longitude == null) {
            return null;
        }
        if (latitude == null || longitude == null) {
            throw ApiException.badRequest("Both latitude and longitude are required");
        }
        return new GeoJsonPoint(longitude, latitude);
    }

    private static void requireEmployer(AuthUser user, Task task) {
        if (!TaskLookup.isEmployer(user, task)) {
            throw ApiException.forbidden("Only the employer who posted this task can do that");
        }
    }

    private static void requireAvailable(Task task) {
        if (task.getStatus() == TaskStatus.cancelled || task.getStatus() == TaskStatus.expired) {
            throw ApiException.badRequest("Task is no longer available");
        }
        if (task.getStatus() != TaskStatus.open) {
            throw ApiException.badRequest("Task already assigned");
        }
        if (task.getDeadline() != null && task.getDeadline().isBefore(Instant.now())) {
            throw ApiException.badRequest("Task has expired");
        }
    }

    private String nameOf(String userId) {
        return users.findById(userId).map(User::getName).orElse("A freelancer");
    }
}
