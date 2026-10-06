package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.RatingRequest;
import com.gigpilot.dto.Dtos.RatingUpdateRequest;
import com.gigpilot.dto.Dtos.RatingView;
import com.gigpilot.dto.Dtos.ReplyRequest;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.RatingService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
public class RatingController {
    private final RatingService ratings;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RatingView create(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody RatingRequest req) {
        return ratings.create(user, req);
    }

    @GetMapping("/{userId}")
    public List<RatingView> forUser(@PathVariable String userId) {
        return ratings.forUser(userId);
    }

    /** The author edits their own rating. */
    @PutMapping("/{id}")
    public RatingView update(
            @AuthenticationPrincipal AuthUser user, @PathVariable String id, @Valid @RequestBody RatingUpdateRequest req) {
        return ratings.update(user, id, req);
    }

    /** The rated user posts a single public reply. */
    @PostMapping("/{id}/reply")
    public RatingView reply(
            @AuthenticationPrincipal AuthUser user, @PathVariable String id, @Valid @RequestBody ReplyRequest req) {
        return ratings.reply(user, id, req);
    }
}
