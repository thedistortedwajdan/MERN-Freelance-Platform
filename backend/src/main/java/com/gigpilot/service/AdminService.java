package com.gigpilot.service;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.gigpilot.dto.Dtos.AdminStats;
import com.gigpilot.dto.Dtos.AuditView;
import com.gigpilot.dto.Dtos.TaskView;
import com.gigpilot.dto.Dtos.UserView;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.AccountStatus;
import com.gigpilot.model.AuditLog;
import com.gigpilot.model.DisputeStatus;
import com.gigpilot.model.Rating;
import com.gigpilot.model.ReportStatus;
import com.gigpilot.model.Role;
import com.gigpilot.model.Task;
import com.gigpilot.model.TaskStatus;
import com.gigpilot.model.User;
import com.gigpilot.repository.AuditLogRepository;
import com.gigpilot.repository.DisputeRepository;
import com.gigpilot.repository.RatingRepository;
import com.gigpilot.repository.ReportRepository;
import com.gigpilot.repository.TaskRepository;
import com.gigpilot.repository.UserRepository;
import com.gigpilot.security.AuthUser;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Moderation and oversight. Every mutating action is written to the audit log. */
@Service
@RequiredArgsConstructor
public class AdminService {
    private final UserRepository users;
    private final TaskRepository tasks;
    private final RatingRepository ratings;
    private final DisputeRepository disputes;
    private final ReportRepository reports;
    private final AuditLogRepository auditLogs;
    private final MongoTemplate mongo;
    private final RefreshTokenService refreshTokens;
    private final AuditService audit;
    private final ViewMapper mapper;

    public AdminStats stats() {
        Map<String, Long> byRole = new LinkedHashMap<>();
        for (Role role : Role.values()) {
            byRole.put(role.name(), users.countByRole(role));
        }
        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (TaskStatus status : TaskStatus.values()) {
            byStatus.put(status.name(), mongo.count(query(where("status").is(status.name())), Task.class));
        }
        return new AdminStats(
                byRole,
                byStatus,
                ratings.count(),
                disputes.countByStatus(DisputeStatus.open),
                reports.countByStatus(ReportStatus.open));
    }

    public Page<UserView> users(String q, Role role, AccountStatus status, Pageable pageable) {
        List<Criteria> all = new ArrayList<>();
        if (StringUtils.hasText(q)) {
            String quoted = Pattern.quote(q.trim());
            all.add(new Criteria().orOperator(where("name").regex(quoted, "i"), where("email").regex(quoted, "i")));
        }
        if (role != null) {
            all.add(where("role").is(role.name()));
        }
        if (status != null) {
            all.add(status == AccountStatus.active
                    ? where("status").ne(AccountStatus.suspended.name())
                    : where("status").is(status.name()));
        }
        Query q1 = all.isEmpty() ? new Query() : query(new Criteria().andOperator(all.toArray(new Criteria[0])));
        long total = mongo.count(Query.of(q1), User.class);
        List<UserView> content = mongo.find(Query.of(q1).with(pageable), User.class).stream()
                .map(ViewMapper::userView)
                .toList();
        return new PageImpl<>(content, pageable, total);
    }

    public UserView suspend(AuthUser admin, String userId, String reason) {
        User user = requireUser(userId);
        if (user.getRole() == Role.admin) {
            throw ApiException.badRequest("Admins cannot be suspended");
        }
        user.setStatus(AccountStatus.suspended);
        users.save(user);
        refreshTokens.revokeAll(userId);
        audit.log(admin.id(), "user.suspend", "user", userId, reason);
        return ViewMapper.userView(user);
    }

    public UserView unsuspend(AuthUser admin, String userId) {
        User user = requireUser(userId);
        user.setStatus(AccountStatus.active);
        users.save(user);
        audit.log(admin.id(), "user.unsuspend", "user", userId, null);
        return ViewMapper.userView(user);
    }

    public Page<TaskView> tasks(String q, TaskStatus status, Boolean hidden, Pageable pageable) {
        List<Criteria> all = new ArrayList<>();
        if (StringUtils.hasText(q)) {
            all.add(where("title").regex(Pattern.quote(q.trim()), "i"));
        }
        if (status != null) {
            all.add(where("status").is(status.name()));
        }
        if (hidden != null) {
            all.add(hidden ? where("hidden").is(true) : where("hidden").ne(true));
        }
        Query q1 = all.isEmpty() ? new Query() : query(new Criteria().andOperator(all.toArray(new Criteria[0])));
        long total = mongo.count(Query.of(q1), Task.class);
        List<Task> content = mongo.find(Query.of(q1).with(pageable), Task.class);
        return new PageImpl<>(mapper.tasks(content), pageable, total);
    }

    public TaskView setHidden(AuthUser admin, String taskId, boolean hidden) {
        Ids.require(taskId, "Task");
        Task task = tasks.findById(taskId).orElseThrow(() -> ApiException.notFound("Task not found"));
        task.setHidden(hidden);
        tasks.save(task);
        audit.log(admin.id(), hidden ? "task.hide" : "task.unhide", "task", taskId, task.getTitle());
        return mapper.task(task);
    }

    @CacheEvict(cacheNames = "publicProfiles", allEntries = true)
    public void deleteRating(AuthUser admin, String ratingId) {
        Ids.require(ratingId, "rating");
        Rating rating = ratings.findById(ratingId).orElseThrow(() -> ApiException.notFound("Rating not found"));
        ratings.delete(rating);
        audit.log(admin.id(), "rating.delete", "rating", ratingId, "to=" + rating.getTo());
    }

    public Page<AuditView> audit(Pageable pageable) {
        Page<AuditLog> page = auditLogs.findAll(pageable);
        Map<String, User> actors = mapper.loadUsers(page.getContent().stream().map(AuditLog::getActor));
        List<AuditView> content = page.getContent().stream()
                .map(a -> new AuditView(
                        a.getId(),
                        ViewMapper.ref(actors.get(a.getActor())),
                        a.getAction(),
                        a.getTargetType(),
                        a.getTargetId(),
                        a.getDetails(),
                        a.getCreatedAt()))
                .toList();
        return new PageImpl<>(content, pageable, page.getTotalElements());
    }

    private User requireUser(String id) {
        Ids.require(id, "user");
        return users.findById(id).orElseThrow(() -> ApiException.notFound("User not found"));
    }
}
