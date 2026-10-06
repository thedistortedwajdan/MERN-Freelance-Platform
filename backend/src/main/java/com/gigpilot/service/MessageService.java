package com.gigpilot.service;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.gigpilot.dto.Dtos.ChatMessage;
import com.gigpilot.dto.Dtos.ConversationView;
import com.gigpilot.dto.Dtos.UserRef;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.Message;
import com.gigpilot.model.Task;
import com.gigpilot.model.TaskStatus;
import com.gigpilot.model.User;
import com.gigpilot.repository.MessageRepository;
import com.gigpilot.security.AuthUser;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Task-scoped chat between the employer and the assigned freelancer. Clients poll
 * {@code GET /tasks/{id}/messages?after=<lastId>} (about every 500 ms); an empty poll is a single indexed query.
 */
@Service
@RequiredArgsConstructor
public class MessageService {
    private static final int MAX_PAGE = 200;
    private static final Set<TaskStatus> WRITABLE = Set.of(TaskStatus.assigned, TaskStatus.submitted, TaskStatus.completed);

    private final MessageRepository messages;
    private final MongoTemplate mongo;
    private final TaskLookup lookup;
    private final BlockService blocks;
    private final ViewMapper mapper;

    public ChatMessage send(AuthUser user, String taskId, String text) {
        Task task = requireConversation(user, taskId);
        if (!WRITABLE.contains(task.getStatus())) {
            throw ApiException.badRequest("This conversation is closed");
        }
        String recipient = TaskLookup.counterpart(user, task);
        if (blocks.isBlocked(user.id(), recipient)) {
            throw ApiException.forbidden("You cannot message this user");
        }
        Message m = new Message();
        m.setTask(taskId);
        m.setSender(user.id());
        m.setRecipient(recipient);
        m.setText(text.trim());
        return view(messages.save(m));
    }

    /**
     * Messages in ascending order. With {@code after} (a message id) only newer messages are returned;
     * without it, the latest {@code limit} messages.
     */
    public List<ChatMessage> list(AuthUser user, String taskId, String after, int limit) {
        requireConversation(user, taskId);
        int size = Math.min(Math.max(limit, 1), MAX_PAGE);
        Criteria c = where("task").is(new ObjectId(taskId));
        if (StringUtils.hasText(after)) {
            c = c.and("_id").gt(new ObjectId(Ids.require(after, "message")));
            Query q = query(c).with(Sort.by(Sort.Direction.ASC, "id")).limit(size);
            return mongo.find(q, Message.class).stream().map(MessageService::view).toList();
        }
        Query q = query(c).with(Sort.by(Sort.Direction.DESC, "id")).limit(size);
        List<ChatMessage> latest = new ArrayList<>(mongo.find(q, Message.class).stream().map(MessageService::view).toList());
        Collections.reverse(latest);
        return latest;
    }

    public void markRead(AuthUser user, String taskId) {
        requireConversation(user, taskId);
        mongo.updateMulti(
                query(where("task").is(new ObjectId(taskId))
                        .and("recipient").is(new ObjectId(user.id()))
                        .and("readAt").is(null)),
                new Update().set("readAt", Instant.now()),
                Message.class);
    }

    public long unreadCount(AuthUser user) {
        return messages.countByRecipientAndReadAtIsNull(user.id());
    }

    public List<ConversationView> conversations(AuthUser user) {
        ObjectId me = new ObjectId(user.id());
        Criteria c = new Criteria().andOperator(
                where("freelancer").ne(null),
                new Criteria().orOperator(where("employer").is(me), where("freelancer").is(me)));
        List<Task> mine = mongo.find(
                query(c).with(Sort.by(Sort.Direction.DESC, "updatedAt")).limit(100), Task.class);
        Map<String, User> people = mapper.loadUsers(mine.stream().flatMap(t -> Stream.of(t.getEmployer(), t.getFreelancer())));

        return mine.stream()
                .map(t -> {
                    String otherId = user.id().equals(t.getEmployer()) ? t.getFreelancer() : t.getEmployer();
                    UserRef other = ViewMapper.ref(people.get(otherId));
                    ChatMessage last = messages.findFirstByTaskOrderByIdDesc(t.getId()).map(MessageService::view).orElse(null);
                    long unread = messages.countByTaskAndRecipientAndReadAtIsNull(t.getId(), user.id());
                    return new ConversationView(t.getId(), t.getTitle(), t.getStatus(), other, last, unread);
                })
                .toList();
    }

    /** The caller must be the employer or the assigned freelancer of a task that has a freelancer. */
    private Task requireConversation(AuthUser user, String taskId) {
        Task task = lookup.require(taskId);
        if (!TaskLookup.isParticipant(user, task)) {
            throw ApiException.forbidden("Access denied");
        }
        if (task.getFreelancer() == null) {
            throw ApiException.badRequest("There is no conversation yet: no freelancer is assigned");
        }
        return task;
    }

    private static ChatMessage view(Message m) {
        return new ChatMessage(
                m.getId(), m.getTask(), m.getSender(), m.getRecipient(), m.getText(), m.getReadAt(), m.getCreatedAt());
    }
}
