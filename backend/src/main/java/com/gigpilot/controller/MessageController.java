package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.ChatMessage;
import com.gigpilot.dto.Dtos.ConversationView;
import com.gigpilot.dto.Dtos.MessageRequest;
import com.gigpilot.dto.Dtos.MessageResponse;
import com.gigpilot.dto.Dtos.UnreadCount;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.MessageService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Chat is plain REST. Poll {@code GET /api/tasks/{taskId}/messages?after=<lastMessageId>} (every ~500 ms):
 * it returns only messages newer than {@code after}, oldest first.
 */
@RestController
@RequiredArgsConstructor
public class MessageController {
    private final MessageService messages;

    @PostMapping("/api/tasks/{taskId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessage send(
            @AuthenticationPrincipal AuthUser user, @PathVariable String taskId, @Valid @RequestBody MessageRequest req) {
        return messages.send(user, taskId, req.text());
    }

    @GetMapping("/api/tasks/{taskId}/messages")
    public ResponseEntity<List<ChatMessage>> list(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String taskId,
            @RequestParam(required = false) String after,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(messages.list(user, taskId, after, limit));
    }

    @PostMapping("/api/tasks/{taskId}/messages/read")
    public MessageResponse markRead(@AuthenticationPrincipal AuthUser user, @PathVariable String taskId) {
        messages.markRead(user, taskId);
        return new MessageResponse("Marked as read");
    }

    @GetMapping("/api/messages/unread-count")
    public ResponseEntity<UnreadCount> unread(@AuthenticationPrincipal AuthUser user) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new UnreadCount(messages.unreadCount(user)));
    }

    @GetMapping("/api/conversations")
    public List<ConversationView> conversations(@AuthenticationPrincipal AuthUser user) {
        return messages.conversations(user);
    }
}
