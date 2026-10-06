package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.AdminStats;
import com.gigpilot.dto.Dtos.AuditView;
import com.gigpilot.dto.Dtos.DisputeView;
import com.gigpilot.dto.Dtos.MessageResponse;
import com.gigpilot.dto.Dtos.ReportView;
import com.gigpilot.dto.Dtos.ResolveDisputeRequest;
import com.gigpilot.dto.Dtos.ResolveReportRequest;
import com.gigpilot.dto.Dtos.SuspendRequest;
import com.gigpilot.dto.Dtos.TaskView;
import com.gigpilot.dto.Dtos.UserView;
import com.gigpilot.model.AccountStatus;
import com.gigpilot.model.DisputeStatus;
import com.gigpilot.model.ReportStatus;
import com.gigpilot.model.Role;
import com.gigpilot.model.TaskStatus;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.AdminService;
import com.gigpilot.service.DisputeService;
import com.gigpilot.service.ReportService;
import com.gigpilot.util.Pages;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only (enforced in SecurityConfig for /api/admin/**). */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt");

    private final AdminService admin;
    private final DisputeService disputes;
    private final ReportService reports;

    @GetMapping("/stats")
    public AdminStats stats() {
        return admin.stats();
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserView>> users(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) AccountStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        return Pages.ok(admin.users(q, role, status, Pages.of(page, size, NEWEST_FIRST)));
    }

    @PostMapping("/users/{id}/suspend")
    public UserView suspend(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String id,
            @Valid @RequestBody(required = false) SuspendRequest req) {
        return admin.suspend(user, id, req == null ? null : req.reason());
    }

    @PostMapping("/users/{id}/unsuspend")
    public UserView unsuspend(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return admin.unsuspend(user, id);
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<TaskView>> tasks(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Boolean hidden,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        return Pages.ok(admin.tasks(q, status, hidden, Pages.of(page, size, NEWEST_FIRST)));
    }

    @PostMapping("/tasks/{id}/hide")
    public TaskView hide(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return admin.setHidden(user, id, true);
    }

    @PostMapping("/tasks/{id}/unhide")
    public TaskView unhide(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return admin.setHidden(user, id, false);
    }

    @DeleteMapping("/ratings/{id}")
    public MessageResponse deleteRating(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        admin.deleteRating(user, id);
        return new MessageResponse("Rating deleted");
    }

    @GetMapping("/disputes")
    public ResponseEntity<List<DisputeView>> disputes(
            @RequestParam(required = false) DisputeStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        return Pages.ok(disputes.list(status, Pages.of(page, size, NEWEST_FIRST)));
    }

    @PostMapping("/disputes/{id}/resolve")
    public DisputeView resolveDispute(
            @AuthenticationPrincipal AuthUser user, @PathVariable String id, @Valid @RequestBody ResolveDisputeRequest req) {
        return disputes.resolve(user, id, req);
    }

    @GetMapping("/reports")
    public ResponseEntity<List<ReportView>> reports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        return Pages.ok(reports.list(status, Pages.of(page, size, NEWEST_FIRST)));
    }

    @PostMapping("/reports/{id}/resolve")
    public ReportView resolveReport(
            @AuthenticationPrincipal AuthUser user, @PathVariable String id, @Valid @RequestBody ResolveReportRequest req) {
        return reports.resolve(user, id, req);
    }

    @GetMapping("/audit")
    public ResponseEntity<List<AuditView>> audit(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        return Pages.ok(admin.audit(Pages.of(page, size, NEWEST_FIRST)));
    }
}
