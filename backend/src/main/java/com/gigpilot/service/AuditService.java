package com.gigpilot.service;

import com.gigpilot.model.AuditLog;
import com.gigpilot.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Append-only record of sensitive actions (moderation, disputes, task state changes). */
@Service
@RequiredArgsConstructor
public class AuditService {
    private final AuditLogRepository logs;

    public void log(String actorId, String action, String targetType, String targetId, String details) {
        AuditLog entry = new AuditLog();
        entry.setActor(actorId);
        entry.setAction(action);
        entry.setTargetType(targetType);
        entry.setTargetId(targetId);
        entry.setDetails(details);
        logs.save(entry);
    }
}
