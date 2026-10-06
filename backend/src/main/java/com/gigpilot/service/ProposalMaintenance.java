package com.gigpilot.service;

import com.gigpilot.model.NotificationType;
import com.gigpilot.model.Proposal;
import com.gigpilot.model.ProposalStatus;
import com.gigpilot.model.Task;
import com.gigpilot.repository.ProposalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Bulk proposal state changes triggered by task events. */
@Component
@RequiredArgsConstructor
public class ProposalMaintenance {
    private final ProposalRepository proposals;
    private final NotificationService notifications;

    /** Rejects every pending proposal on the task (except one) and tells the freelancers. */
    public void closePending(Task task, String exceptProposalId, NotificationType type, String message) {
        for (Proposal p : proposals.findByTaskAndStatus(task.getId(), ProposalStatus.pending)) {
            if (p.getId().equals(exceptProposalId)) {
                continue;
            }
            p.setStatus(ProposalStatus.rejected);
            proposals.save(p);
            notifications.notify(p.getFreelancer(), type, message, task.getId());
        }
    }

    /** Marks the accepted proposal as withdrawn when the freelancer drops out of an assigned task. */
    public void withdrawAccepted(String taskId, String freelancerId) {
        proposals.findByTaskAndFreelancer(taskId, freelancerId)
                .filter(p -> p.getStatus() == ProposalStatus.accepted)
                .ifPresent(p -> {
                    p.setStatus(ProposalStatus.withdrawn);
                    proposals.save(p);
                });
    }
}
