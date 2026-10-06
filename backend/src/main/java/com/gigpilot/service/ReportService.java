package com.gigpilot.service;

import com.gigpilot.dto.Dtos.ReportRequest;
import com.gigpilot.dto.Dtos.ReportView;
import com.gigpilot.dto.Dtos.ResolveReportRequest;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.NotificationType;
import com.gigpilot.model.Report;
import com.gigpilot.model.ReportStatus;
import com.gigpilot.model.User;
import com.gigpilot.repository.RatingRepository;
import com.gigpilot.repository.ReportRepository;
import com.gigpilot.repository.TaskRepository;
import com.gigpilot.repository.UserRepository;
import com.gigpilot.security.AuthUser;
import com.gigpilot.util.Texts;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

/** Users flag a user, task or rating for moderators. */
@Service
@RequiredArgsConstructor
public class ReportService {
    private final ReportRepository reports;
    private final UserRepository users;
    private final TaskRepository tasks;
    private final RatingRepository ratings;
    private final NotificationService notifications;
    private final AuditService audit;
    private final ViewMapper mapper;

    public ReportView create(AuthUser user, ReportRequest req) {
        Ids.require(req.targetId(), "target");
        boolean exists = switch (req.targetType()) {
            case user -> users.existsById(req.targetId());
            case task -> tasks.existsById(req.targetId());
            case rating -> ratings.existsById(req.targetId());
        };
        if (!exists) {
            throw ApiException.notFound("The reported item was not found");
        }
        if (req.targetId().equals(user.id())) {
            throw ApiException.badRequest("You cannot report yourself");
        }
        if (reports.existsByReporterAndTargetTypeAndTargetIdAndStatus(
                user.id(), req.targetType(), req.targetId(), ReportStatus.open)) {
            throw ApiException.badRequest("You have already reported this");
        }
        Report report = new Report();
        report.setReporter(user.id());
        report.setTargetType(req.targetType());
        report.setTargetId(req.targetId());
        report.setReason(req.reason().trim());
        reports.save(report);
        return views(List.of(report)).get(0);
    }

    public Page<ReportView> list(ReportStatus status, Pageable pageable) {
        Page<Report> page = status == null ? reports.findAll(pageable) : reports.findByStatus(status, pageable);
        return new PageImpl<>(views(page.getContent()), pageable, page.getTotalElements());
    }

    public ReportView resolve(AuthUser admin, String id, ResolveReportRequest req) {
        Ids.require(id, "report");
        Report report = reports.findById(id).orElseThrow(() -> ApiException.notFound("Report not found"));
        if (report.getStatus() != ReportStatus.open) {
            throw ApiException.badRequest("This report is already closed");
        }
        if (req.status() == ReportStatus.open) {
            throw ApiException.badRequest("Status must be actioned or dismissed");
        }
        report.setStatus(req.status());
        report.setResolutionNote(Texts.trimToNull(req.note()));
        report.setResolvedBy(admin.id());
        report.setResolvedAt(Instant.now());
        reports.save(report);

        notifications.notify(report.getReporter(), NotificationType.report_resolved,
                "Your report was reviewed (" + req.status().name() + ")", null);
        audit.log(admin.id(), "report." + req.status().name(), "report", id, report.getTargetType() + ":" + report.getTargetId());
        return views(List.of(report)).get(0);
    }

    private List<ReportView> views(List<Report> list) {
        Map<String, User> byId = mapper.loadUsers(list.stream().map(Report::getReporter));
        return list.stream()
                .map(r -> new ReportView(
                        r.getId(),
                        ViewMapper.ref(byId.get(r.getReporter())),
                        r.getTargetType(),
                        r.getTargetId(),
                        r.getReason(),
                        r.getStatus(),
                        r.getResolutionNote(),
                        r.getResolvedAt(),
                        r.getCreatedAt()))
                .toList();
    }
}
