package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.ProposalRequest;
import com.gigpilot.dto.Dtos.ProposalView;
import com.gigpilot.dto.Dtos.TaskView;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.ProposalService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class ProposalController {
    private final ProposalService proposals;

    /** A freelancer bids on an open task. */
    @PostMapping("/api/tasks/{taskId}/proposals")
    @ResponseStatus(HttpStatus.CREATED)
    public ProposalView submit(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String taskId,
            @Valid @RequestBody ProposalRequest req) {
        return proposals.submit(user, taskId, req);
    }

    /** The employer reviews the bids on their task. */
    @GetMapping("/api/tasks/{taskId}/proposals")
    public List<ProposalView> forTask(@AuthenticationPrincipal AuthUser user, @PathVariable String taskId) {
        return proposals.forTask(user, taskId);
    }

    @GetMapping("/api/proposals/mine")
    public List<ProposalView> mine(@AuthenticationPrincipal AuthUser user) {
        return proposals.mine(user);
    }

    /** Accepting assigns the task to that freelancer at the proposed price and declines the rest. */
    @PostMapping("/api/proposals/{id}/accept")
    public TaskView accept(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return proposals.accept(user, id);
    }

    @PostMapping("/api/proposals/{id}/reject")
    public ProposalView reject(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return proposals.reject(user, id);
    }

    @PostMapping("/api/proposals/{id}/withdraw")
    public ProposalView withdraw(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return proposals.withdraw(user, id);
    }
}
