package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.MessageResponse;
import com.gigpilot.dto.Dtos.SavedSearchRequest;
import com.gigpilot.dto.Dtos.SavedSearchView;
import com.gigpilot.dto.Dtos.TaskView;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.SavedSearchService;
import com.gigpilot.service.TaskService;
import com.gigpilot.util.Pages;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/saved-searches")
@RequiredArgsConstructor
public class SavedSearchController {
    private final SavedSearchService searches;

    @GetMapping
    public List<SavedSearchView> list(@AuthenticationPrincipal AuthUser user) {
        return searches.list(user.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SavedSearchView create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody SavedSearchRequest req) {
        return searches.create(user.id(), req);
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        searches.delete(user.id(), id);
        return new MessageResponse("Saved search deleted");
    }

    /** Runs the saved filters against the current open tasks. */
    @GetMapping("/{id}/results")
    public ResponseEntity<List<TaskView>> results(
            @AuthenticationPrincipal AuthUser user,
            @PathVariable String id,
            @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + Pages.DEFAULT_SIZE) int size) {
        return Pages.ok(searches.run(user.id(), id, Pages.of(page, size, TaskService.sortFor(sort))));
    }
}
