package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.MessageResponse;
import com.gigpilot.dto.Dtos.NotificationView;
import com.gigpilot.dto.Dtos.UnreadCount;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.NotificationService;
import com.gigpilot.util.Pages;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** In-app notifications (no email). Poll {@code /unread-count}, or the list with {@code after=<lastId>}. */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notifications;

    @GetMapping
    public ResponseEntity<List<NotificationView>> list(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(defaultValue = "false") boolean unread,
            @RequestParam(required = false) String after,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        var result = notifications.list(user.id(), unread, after, Pages.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Total-Count", String.valueOf(result.getTotalElements()))
                .header("X-Total-Pages", String.valueOf(result.getTotalPages()))
                .body(result.getContent());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCount> unreadCount(@AuthenticationPrincipal AuthUser user) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(new UnreadCount(notifications.unreadCount(user.id())));
    }

    @PostMapping("/{id}/read")
    public MessageResponse markRead(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        notifications.markRead(user.id(), id);
        return new MessageResponse("Marked as read");
    }

    @PostMapping("/read-all")
    public MessageResponse markAllRead(@AuthenticationPrincipal AuthUser user) {
        notifications.markAllRead(user.id());
        return new MessageResponse("All notifications marked as read");
    }
}
