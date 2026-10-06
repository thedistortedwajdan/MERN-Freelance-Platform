package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.ReportRequest;
import com.gigpilot.dto.Dtos.ReportView;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {
    private final ReportService reports;

    /** Flag a user, task or rating for moderator review. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReportView create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody ReportRequest req) {
        return reports.create(user, req);
    }
}
