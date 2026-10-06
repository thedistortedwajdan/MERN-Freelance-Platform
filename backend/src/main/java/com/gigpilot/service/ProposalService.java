package com.gigpilot.service;

import com.gigpilot.dto.Dtos.ProposalRequest;
import com.gigpilot.dto.Dtos.ProposalView;
import com.gigpilot.dto.Dtos.TaskView;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.NotificationType;
import com.gigpilot.model.Proposal;
import com.gigpilot.model.ProposalStatus;
import com.gigpilot.model.Role;
import com.gigpilot.model.Task;
import com.gigpilot.model.TaskStatus;
import com.gigpilot.model.User;
import com.gigpilot.repository.ProposalRepository;
import com.gigpilot.repository.TaskRepository;
import com.gigpilot.repository.UserRepository;
import com.gigpilot.security.AuthUser;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/** Bidding: freelancers propose a price and message, the employer picks one. */
@Service
@RequiredArgsConstructor
public class ProposalService {
    private static final Sort OLDEST_FIRST = Sort.by(Sort.Direction.ASC, "createdAt");
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Direction.DESC, "createdAt");

    private final ProposalRepository proposals;
    private final TaskRepository tasks;
    private final UserRepository users;
    private final TaskLookup lookup;
    private final TaskService taskService;
    private final ProposalMaintenance maintenance;
    private final NotificationService notifications;
    private final BlockService blocks;
    private final ViewMapper mapper;

    public ProposalView submit(AuthUser user, String taskId, ProposalRequest req) {
        if (user.role() != Role.freelancer) {
            throw ApiException.forbidden("Only freelancers can send proposals");
        }
        Task task = lookup.require(taskId);
        if (task.isHidden()) {
            throw ApiException.notFound("Task not found");
        }
        if (task.getStatus() != TaskStatus.open) {
            throw ApiException.badRequest("This task is not accepting proposals");
        }
        if (task.getDeadline() != null && task.getDeadline().isBefore(Instant.now())) {
            throw ApiException.badRequest("Task has expired");
        }
        if (blocks.isBlocked(user.id(), task.getEmployer())) {
            throw ApiException.forbidden("You cannot send a proposal for this task");
        }

        Proposal proposal = proposals.findByTaskAndFreelancer(taskId, user.id()).orElse(null);
        if (proposal != null && proposal.getStatus() != ProposalStatus.withdrawn) {
            throw ApiException.badRequest("You have already sent a proposal for this task");
        }
        if (proposal == null) {
            proposal = new Proposal();
            proposal.setTask(taskId);
            proposal.setFreelancer(user.id());
        }
        proposal.setPrice(req.price());
        proposal.setMessage(req.message().trim());
        proposal.setEtaDays(req.etaDays());
        proposal.setStatus(ProposalStatus.pending);
        try {
            proposals.save(proposal);
        } catch (DuplicateKeyException e) {
            throw ApiException.badRequest("You have already sent a proposal for this task");
        }

        String name = users.findById(user.id()).map(User::getName).orElse("A freelancer");
        notifications.notify(task.getEmployer(), NotificationType.proposal_received,
                name + " sent a proposal for \"" + task.getTitle() + "\"", taskId);
        return views(List.of(proposal)).get(0);
    }

    /** Proposals on a task, visible to its employer (and admins). */
    public List<ProposalView> forTask(AuthUser user, String taskId) {
        Task task = lookup.require(taskId);
        if (!TaskLookup.isEmployer(user, task) && user.role() != Role.admin) {
            throw ApiException.forbidden("Only the employer who posted this task can see its proposals");
        }
        return views(proposals.findByTask(taskId, OLDEST_FIRST));
    }

    public List<ProposalView> mine(AuthUser user) {
        if (user.role() != Role.freelancer) {
            throw ApiException.forbidden("Only freelancers have proposals");
        }
        return views(proposals.findByFreelancer(user.id(), NEWEST_FIRST));
    }

    public TaskView accept(AuthUser user, String proposalId) {
        Proposal proposal = require(proposalId);
        Task task = lookup.require(proposal.getTask());
        requireEmployer(user, task);
        if (proposal.getStatus() != ProposalStatus.pending) {
            throw ApiException.badRequest("This proposal is no longer pending");
        }
        Task assigned = taskService.assign(task.getId(), proposal.getFreelancer(), proposal.getPrice());
        if (assigned == null) {
            throw ApiException.badRequest("Task is no longer open");
        }
        proposal.setStatus(ProposalStatus.accepted);
        proposals.save(proposal);

        maintenance.closePending(assigned, proposal.getId(), NotificationType.proposal_rejected,
                "Another proposal was chosen for \"" + assigned.getTitle() + "\"");
        notifications.notify(proposal.getFreelancer(), NotificationType.proposal_accepted,
                "Your proposal for \"" + assigned.getTitle() + "\" was accepted", assigned.getId());
        return mapper.task(assigned);
    }

    public ProposalView reject(AuthUser user, String proposalId) {
        Proposal proposal = require(proposalId);
        Task task = lookup.require(proposal.getTask());
        requireEmployer(user, task);
        if (proposal.getStatus() != ProposalStatus.pending) {
            throw ApiException.badRequest("This proposal is no longer pending");
        }
        proposal.setStatus(ProposalStatus.rejected);
        proposals.save(proposal);
        notifications.notify(proposal.getFreelancer(), NotificationType.proposal_rejected,
                "Your proposal for \"" + task.getTitle() + "\" was declined", task.getId());
        return views(List.of(proposal)).get(0);
    }

    public ProposalView withdraw(AuthUser user, String proposalId) {
        Proposal proposal = require(proposalId);
        if (!user.id().equals(proposal.getFreelancer())) {
            throw ApiException.forbidden("Access denied");
        }
        if (proposal.getStatus() != ProposalStatus.pending) {
            throw ApiException.badRequest("Only pending proposals can be withdrawn");
        }
        proposal.setStatus(ProposalStatus.withdrawn);
        proposals.save(proposal);
        return views(List.of(proposal)).get(0);
    }

    private Proposal require(String id) {
        Ids.require(id, "proposal");
        return proposals.findById(id).orElseThrow(() -> ApiException.notFound("Proposal not found"));
    }

    private static void requireEmployer(AuthUser user, Task task) {
        if (!TaskLookup.isEmployer(user, task)) {
            throw ApiException.forbidden("Only the employer who posted this task can do that");
        }
    }

    private List<ProposalView> views(List<Proposal> list) {
        Map<String, User> byId = mapper.loadUsers(list.stream().map(Proposal::getFreelancer));
        Map<String, Task> taskById = tasks.findAllById(list.stream().map(Proposal::getTask).distinct().toList()).stream()
                .collect(Collectors.toMap(Task::getId, Function.identity()));
        return list.stream()
                .map(p -> new ProposalView(
                        p.getId(),
                        p.getTask(),
                        taskById.containsKey(p.getTask()) ? taskById.get(p.getTask()).getTitle() : null,
                        ViewMapper.ref(byId.get(p.getFreelancer())),
                        p.getPrice(),
                        p.getMessage(),
                        p.getEtaDays(),
                        p.getStatus(),
                        p.getCreatedAt()))
                .toList();
    }
}
