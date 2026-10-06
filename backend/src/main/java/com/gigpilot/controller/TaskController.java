package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.AcceptResponse;
import com.gigpilot.dto.Dtos.CancelRequest;
import com.gigpilot.dto.Dtos.MessageResponse;
import com.gigpilot.dto.Dtos.RevisionRequest;
import com.gigpilot.dto.Dtos.SubmitRequest;
import com.gigpilot.dto.Dtos.TaskRequest;
import com.gigpilot.dto.Dtos.TaskSearch;
import com.gigpilot.dto.Dtos.TaskView;
import com.gigpilot.model.TaskStatus;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.TaskService;
import com.gigpilot.util.Pages;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {
    private final TaskService tasks;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskView create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody TaskRequest req) {
        return tasks.create(user, req);
    }

    /**
     * Open tasks. Filters: {@code q, location, category, skills, minPrice, maxPrice}, geo search with
     * {@code lat, lng, radiusKm}; sorting with {@code sort=newest|oldest|price_asc|price_desc|deadline};
     * paging with {@code page, size} (totals in X-Total-Count / X-Total-Pages).
     */
    @GetMapping
    public ResponseEntity<List<TaskView>> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) List<String> skills,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(required = false) Double radiusKm,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        TaskSearch filters = new TaskSearch(q, location, category, skills, minPrice, maxPrice, lat, lng, radiusKm);
        Pageable pageable = Pages.of(page, size, TaskService.sortFor(sort));
        return Pages.ok(tasks.search(filters, pageable));
    }

    @GetMapping("/posted")
    public ResponseEntity<List<TaskView>> posted(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        return Pages.ok(tasks.posted(user, status, Pages.of(page, size, TaskService.sortFor(sort))));
    }

    @GetMapping("/assigned")
    public ResponseEntity<List<TaskView>> assigned(
            @AuthenticationPrincipal AuthUser user,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        return Pages.ok(tasks.assigned(user, status, Pages.of(page, size, TaskService.sortFor(sort))));
    }

    @GetMapping("/{id}")
    public TaskView get(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return tasks.get(user, id);
    }

    @PutMapping("/{id}")
    public TaskView update(
            @AuthenticationPrincipal AuthUser user, @PathVariable String id, @Valid @RequestBody TaskRequest req) {
        return tasks.update(user, id, req);
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        tasks.delete(user, id);
        return new MessageResponse("Task deleted");
    }

    /** Instant accept at the posted budget (freelancers). For negotiated prices use proposals. */
    @PostMapping("/{id}/accept")
    public AcceptResponse accept(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return tasks.accept(user, id);
    }

    /** The assigned freelancer drops out; the task reopens. */
    @PostMapping("/{id}/withdraw")
    public TaskView withdraw(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return tasks.withdraw(user, id);
    }

    /** Hand work in for the employer to review (optional note and deliverable file ids). */
    @PostMapping("/{id}/submit")
    public TaskView submit(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String id,
            @Valid @RequestBody(required = false) SubmitRequest req) {
        return tasks.submit(user, id, req);
    }

    /** Employer approves submitted work: the task becomes completed. */
    @PostMapping("/{id}/approve")
    public TaskView approve(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        return tasks.approve(user, id);
    }

    /** Employer sends submitted work back with a note. */
    @PostMapping("/{id}/revision")
    public TaskView revision(
            @AuthenticationPrincipal AuthUser user, @PathVariable String id, @Valid @RequestBody RevisionRequest req) {
        return tasks.requestRevision(user, id, req);
    }

    @PostMapping("/{id}/cancel")
    public TaskView cancel(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String id,
            @Valid @RequestBody(required = false) CancelRequest req) {
        return tasks.cancel(user, id, req);
    }

    /** Legacy one-step completion by the freelancer, without employer review. */
    @PostMapping("/{id}/complete")
    public MessageResponse complete(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        tasks.complete(user, id);
        return new MessageResponse("Task marked as completed");
    }
}
