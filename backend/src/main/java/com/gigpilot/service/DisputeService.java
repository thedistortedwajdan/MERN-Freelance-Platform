package com.gigpilot.service;

import com.gigpilot.dto.Dtos.DisputeRequest;
import com.gigpilot.dto.Dtos.DisputeView;
import com.gigpilot.dto.Dtos.ResolveDisputeRequest;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.Dispute;
import com.gigpilot.model.DisputeOutcome;
import com.gigpilot.model.DisputeStatus;
import com.gigpilot.model.NotificationType;
import com.gigpilot.model.Task;
import com.gigpilot.model.TaskStatus;
import com.gigpilot.model.User;
import com.gigpilot.repository.DisputeRepository;
import com.gigpilot.repository.TaskRepository;
import com.gigpilot.security.AuthUser;
import com.gigpilot.util.Texts;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/** Participants can escalate a problem on an active task; an admin settles it. */
@Service
@RequiredArgsConstructor
public class DisputeService {
    private static final Set<TaskStatus> DISPUTABLE = Set.of(TaskStatus.assigned, TaskStatus.submitted, TaskStatus.completed);

    private final DisputeRepository disputes;
    private final TaskRepository tasks;
    private final TaskLookup lookup;
    private final NotificationService notifications;
    private final AuditService audit;
    private final ViewMapper mapper;

    public DisputeView open(AuthUser user, String taskId, DisputeRequest req) {
        Task task = lookup.require(taskId);
        if (!TaskLookup.isParticipant(user, task) || task.getFreelancer() == null) {
            throw ApiException.forbidden("Only the employer or assigned freelancer can open a dispute");
        }
        if (!DISPUTABLE.contains(task.getStatus())) {
            throw ApiException.badRequest("A dispute can only be opened on an active or completed task");
        }
        if (disputes.existsByTaskAndStatus(taskId, DisputeStatus.open)) {
            throw ApiException.badRequest("There is already an open dispute for this task");
        }
        Dispute dispute = new Dispute();
        dispute.setTask(taskId);
        dispute.setOpenedBy(user.id());
        dispute.setAgainst(TaskLookup.counterpart(user, task));
        dispute.setReason(req.reason().trim());
        disputes.save(dispute);

        notifications.notify(dispute.getAgainst(), NotificationType.dispute_opened,
                "A dispute was opened on \"" + task.getTitle() + "\"", taskId);
        notifications.notifyAdmins(NotificationType.dispute_opened,
                "New dispute on \"" + task.getTitle() + "\"", taskId);
        audit.log(user.id(), "dispute.open", "dispute", dispute.getId(), req.reason());
        return views(List.of(dispute)).get(0);
    }

    public Page<DisputeView> mine(AuthUser user, Pageable pageable) {
        Page<Dispute> page = disputes.findInvolving(user.id(), pageable);
        return new PageImpl<>(views(page.getContent()), pageable, page.getTotalElements());
    }

    public Page<DisputeView> list(DisputeStatus status, Pageable pageable) {
        Page<Dispute> page = status == null ? disputes.findAll(pageable) : disputes.findByStatus(status, pageable);
        List<DisputeView> views = views(page.getContent());
        return new PageImpl<>(views, pageable, page.getTotalElements());
    }

    @CacheEvict(cacheNames = "publicProfiles", allEntries = true)
    public DisputeView resolve(AuthUser admin, String id, ResolveDisputeRequest req) {
        Ids.require(id, "dispute");
        Dispute dispute = disputes.findById(id).orElseThrow(() -> ApiException.notFound("Dispute not found"));
        if (dispute.getStatus() != DisputeStatus.open) {
            throw ApiException.badRequest("This dispute is already closed");
        }
        if (req.resolution() == DisputeStatus.open) {
            throw ApiException.badRequest("Resolution must be resolved or dismissed");
        }
        DisputeOutcome outcome = req.outcome() == null ? DisputeOutcome.none : req.outcome();
        if (req.resolution() == DisputeStatus.dismissed && outcome != DisputeOutcome.none) {
            throw ApiException.badRequest("A dismissed dispute cannot change the task");
        }

        Task task = tasks.findById(dispute.getTask()).orElse(null);
        if (task != null && outcome == DisputeOutcome.complete_task && task.getStatus() != TaskStatus.completed) {
            task.setStatus(TaskStatus.completed);
            task.setCompletedAt(Instant.now());
            tasks.save(task);
        } else if (task != null && outcome == DisputeOutcome.cancel_task && task.getStatus() != TaskStatus.cancelled) {
            task.setStatus(TaskStatus.cancelled);
            task.setCancelReason("Cancelled by moderator after dispute");
            tasks.save(task);
        }

        dispute.setStatus(req.resolution());
        dispute.setOutcome(outcome);
        dispute.setResolutionNote(Texts.trimToNull(req.note()));
        dispute.setResolvedBy(admin.id());
        dispute.setResolvedAt(Instant.now());
        disputes.save(dispute);

        String title = task == null ? "a task" : "\"" + task.getTitle() + "\"";
        String message = "The dispute on " + title + " was " + req.resolution().name();
        notifications.notify(dispute.getOpenedBy(), NotificationType.dispute_resolved, message, dispute.getTask());
        notifications.notify(dispute.getAgainst(), NotificationType.dispute_resolved, message, dispute.getTask());
        audit.log(admin.id(), "dispute." + req.resolution().name(), "dispute", id, outcome.name());
        return views(List.of(dispute)).get(0);
    }

    private List<DisputeView> views(List<Dispute> list) {
        Map<String, User> byId = mapper.loadUsers(list.stream().flatMap(d -> Stream.of(d.getOpenedBy(), d.getAgainst())));
        Map<String, Task> taskById = tasks.findAllById(list.stream().map(Dispute::getTask).distinct().toList()).stream()
                .collect(Collectors.toMap(Task::getId, Function.identity()));
        return list.stream()
                .map(d -> new DisputeView(
                        d.getId(),
                        d.getTask(),
                        taskById.containsKey(d.getTask()) ? taskById.get(d.getTask()).getTitle() : null,
                        ViewMapper.ref(byId.get(d.getOpenedBy())),
                        ViewMapper.ref(byId.get(d.getAgainst())),
                        d.getReason(),
                        d.getStatus(),
                        d.getOutcome(),
                        d.getResolutionNote(),
                        d.getResolvedAt(),
                        d.getCreatedAt()))
                .toList();
    }
}
