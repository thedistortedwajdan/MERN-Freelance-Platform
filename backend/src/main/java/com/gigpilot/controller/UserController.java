package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.MeResponse;
import com.gigpilot.dto.Dtos.MessageResponse;
import com.gigpilot.dto.Dtos.PublicProfileResponse;
import com.gigpilot.dto.Dtos.UpdateProfileRequest;
import com.gigpilot.dto.Dtos.UserRef;
import com.gigpilot.dto.Dtos.UserView;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.BlockService;
import com.gigpilot.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService users;
    private final BlockService blocks;

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal AuthUser user) {
        return users.me(user);
    }

    @PutMapping("/me")
    public UserView updateMe(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody UpdateProfileRequest req) {
        return users.updateMe(user, req);
    }

    @GetMapping("/me/blocks")
    public List<UserRef> myBlocks(@AuthenticationPrincipal AuthUser user) {
        return blocks.list(user.id());
    }

    @GetMapping("/{id}")
    public PublicProfileResponse publicProfile(@PathVariable String id) {
        return users.publicProfile(id);
    }

    /** Blocked users cannot message you, bid on your tasks or accept them (and vice versa). */
    @PostMapping("/{id}/block")
    public MessageResponse block(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        blocks.block(user.id(), id);
        return new MessageResponse("User blocked");
    }

    @DeleteMapping("/{id}/block")
    public MessageResponse unblock(@AuthenticationPrincipal AuthUser user, @PathVariable String id) {
        blocks.unblock(user.id(), id);
        return new MessageResponse("User unblocked");
    }
}
