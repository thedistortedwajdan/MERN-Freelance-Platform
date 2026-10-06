package com.gigpilot.service;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.gigpilot.dto.Dtos.NotificationView;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.Notification;
import com.gigpilot.model.NotificationType;
import com.gigpilot.model.Role;
import com.gigpilot.model.User;
import com.gigpilot.repository.NotificationRepository;
import com.gigpilot.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** In-app notifications only (no email). Clients poll the list or the unread count. */
@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final MongoTemplate mongo;

    public void notify(String userId, NotificationType type, String message, String taskId) {
        if (userId == null) {
            return;
        }
        Notification n = new Notification();
        n.setUser(userId);
        n.setType(type);
        n.setMessage(message);
        n.setTask(taskId);
        notifications.save(n);
    }

    public void notifyAdmins(NotificationType type, String message, String taskId) {
        for (User admin : users.findByRole(Role.admin)) {
            notify(admin.getId(), type, message, taskId);
        }
    }

    /** Newest first. {@code after} restricts to notifications created after that id (cheap polling). */
    public Page<NotificationView> list(String userId, boolean unreadOnly, String after, Pageable pageable) {
        Criteria criteria = where("user").is(new ObjectId(userId));
        if (unreadOnly) {
            criteria = criteria.and("read").is(false);
        }
        if (StringUtils.hasText(after)) {
            criteria = criteria.and("_id").gt(new ObjectId(Ids.require(after, "notification")));
        }
        Query q = query(criteria);
        long total = mongo.count(Query.of(q), Notification.class);
        List<NotificationView> content = mongo.find(Query.of(q).with(pageable), Notification.class).stream()
                .map(NotificationService::view)
                .toList();
        return new PageImpl<>(content, pageable, total);
    }

    public long unreadCount(String userId) {
        return notifications.countByUserAndReadFalse(userId);
    }

    public void markRead(String userId, String id) {
        Ids.require(id, "notification");
        Notification n = notifications.findById(id).orElseThrow(() -> ApiException.notFound("Notification not found"));
        if (!userId.equals(n.getUser())) {
            throw ApiException.forbidden("Access denied");
        }
        if (!n.isRead()) {
            n.setRead(true);
            notifications.save(n);
        }
    }

    public void markAllRead(String userId) {
        mongo.updateMulti(
                query(where("user").is(new ObjectId(userId)).and("read").is(false)),
                new Update().set("read", true),
                Notification.class);
    }

    private static NotificationView view(Notification n) {
        return new NotificationView(n.getId(), n.getType(), n.getMessage(), n.getTask(), n.isRead(), n.getCreatedAt());
    }
}
