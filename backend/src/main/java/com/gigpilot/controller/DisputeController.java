package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.DisputeRequest;
import com.gigpilot.dto.Dtos.DisputeView;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.DisputeService;
import com.gigpilot.util.Pages;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
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

@RestController
@RequiredArgsConstructor
public class DisputeController {
    private final DisputeService disputes;

    @PostMapping("/api/tasks/{taskId}/disputes")
    @ResponseStatus(HttpStatus.CREATED)
    public DisputeView open(
            @AuthenticationPrincipal AuthUser user, @PathVariable String taskId, @Valid @RequestBody DisputeRequest req) {
        return disputes.open(user, taskId, req);
    }

    /** Disputes the caller opened or is a party to. */
    @GetMapping("/api/disputes")
    public ResponseEntity<List<DisputeView>> mine(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        return Pages.ok(disputes.mine(user, Pages.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }
}
