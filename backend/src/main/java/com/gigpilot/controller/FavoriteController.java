package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.MessageResponse;
import com.gigpilot.dto.Dtos.TaskView;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.FavoriteService;
import com.gigpilot.util.Pages;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class FavoriteController {
    private final FavoriteService favorites;

    @GetMapping("/api/tasks/favorites")
    public ResponseEntity<List<TaskView>> list(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        return Pages.ok(favorites.list(user.id(), Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }

    @PostMapping("/api/tasks/{id}/favorite")
    public MessageResponse add(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        favorites.add(user.id(), id);
        return new MessageResponse("Task saved");
    }

    @DeleteMapping("/api/tasks/{id}/favorite")
    public MessageResponse remove(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        favorites.remove(user.id(), id);
        return new MessageResponse("Task removed from saved tasks");
    }
}
