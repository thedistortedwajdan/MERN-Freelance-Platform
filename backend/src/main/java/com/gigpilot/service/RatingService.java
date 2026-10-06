package com.gigpilot.service;

import com.gigpilot.dto.Dtos.RatingRequest;
import com.gigpilot.dto.Dtos.RatingUpdateRequest;
import com.gigpilot.dto.Dtos.RatingView;
import com.gigpilot.dto.Dtos.ReplyRequest;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.NotificationType;
import com.gigpilot.model.Rating;
import com.gigpilot.model.Task;
import com.gigpilot.model.TaskStatus;
import com.gigpilot.model.User;
import com.gigpilot.repository.RatingRepository;
import com.gigpilot.repository.TaskRepository;
import com.gigpilot.repository.UserRepository;
import com.gigpilot.security.AuthUser;
import com.gigpilot.util.Texts;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RatingService {
    private final RatingRepository ratings;
    private final TaskRepository tasks;
    private final UserRepository users;
    private final NotificationService notifications;
    private final ViewMapper mapper;

    @CacheEvict(cacheNames = "publicProfiles", allEntries = true)
    public RatingView create(AuthUser user, RatingRequest req) {
        Ids.require(req.task(), "task");
        Ids.require(req.to(), "recipient");

        Task task = tasks.findById(req.task()).orElseThrow(() -> ApiException.notFound("Task not found"));
        if (task.getStatus() != TaskStatus.completed) {
            throw ApiException.badRequest("Task is not completed yet");
        }

        boolean involved = user.id().equals(task.getEmployer()) || user.id().equals(task.getFreelancer());
        if (!involved) {
            throw ApiException.forbidden("Not allowed to rate for this task");
        }

        boolean recipientInvolved = req.to().equals(task.getEmployer()) || req.to().equals(task.getFreelancer());
        if (req.to().equals(user.id()) || !recipientInvolved) {
            throw ApiException.badRequest("Invalid recipient");
        }

        Rating rating = new Rating();
        rating.setFrom(user.id());
        rating.setTo(req.to());
        rating.setTask(req.task());
        rating.setScore(req.score());
        rating.setComment(Texts.trimToNull(req.comment()));
        try {
            ratings.save(rating);
        } catch (DuplicateKeyException e) {
            throw ApiException.badRequest("You have already rated this user for this task");
        }
        notifications.notify(req.to(), NotificationType.rating_received,
                nameOf(user.id()) + " rated you " + req.score() + "/5 for \"" + task.getTitle() + "\"", task.getId());
        return mapper.ratings(List.of(rating)).get(0);
    }

    public List<RatingView> forUser(String userId) {
        Ids.require(userId, "user");
        return mapper.ratings(ratings.findByRecipient(userId, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    /** Authors can edit their own rating. */
    @CacheEvict(cacheNames = "publicProfiles", allEntries = true)
    public RatingView update(AuthUser user, String id, RatingUpdateRequest req) {
        Rating rating = require(id);
        if (!user.id().equals(rating.getFrom())) {
            throw ApiException.forbidden("You can only edit your own ratings");
        }
        rating.setScore(req.score());
        rating.setComment(Texts.trimToNull(req.comment()));
        ratings.save(rating);
        return mapper.ratings(List.of(rating)).get(0);
    }

    /** The rated user can post one public reply. */
    public RatingView reply(AuthUser user, String id, ReplyRequest req) {
        Rating rating = require(id);
        if (!user.id().equals(rating.getTo())) {
            throw ApiException.forbidden("Only the rated user can reply");
        }
        if (rating.getReply() != null) {
            throw ApiException.badRequest("You have already replied to this rating");
        }
        rating.setReply(req.reply().trim());
        rating.setRepliedAt(Instant.now());
        ratings.save(rating);
        notifications.notify(rating.getFrom(), NotificationType.rating_reply,
                nameOf(user.id()) + " replied to your rating", rating.getTask());
        return mapper.ratings(List.of(rating)).get(0);
    }

    private Rating require(String id) {
        Ids.require(id, "rating");
        return ratings.findById(id).orElseThrow(() -> ApiException.notFound("Rating not found"));
    }

    private String nameOf(String userId) {
        return users.findById(userId).map(User::getName).orElse("Someone");
    }
}
