package com.gigpilot.repository;

import com.gigpilot.model.Report;
import com.gigpilot.model.ReportStatus;
import com.gigpilot.model.ReportTarget;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ReportRepository extends MongoRepository<Report, String> {
    Page<Report> findByStatus(ReportStatus status, Pageable pageable);

    boolean existsByReporterAndTargetTypeAndTargetIdAndStatus(
            String reporterId, ReportTarget targetType, String targetId, ReportStatus status);

    long countByStatus(ReportStatus status);
}
