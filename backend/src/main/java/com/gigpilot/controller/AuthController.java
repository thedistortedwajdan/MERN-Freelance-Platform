package com.gigpilot.controller;

import com.gigpilot.dto.Dtos.ForgotPasswordRequest;
import com.gigpilot.dto.Dtos.LoginRequest;
import com.gigpilot.dto.Dtos.LoginResponse;
import com.gigpilot.dto.Dtos.MessageResponse;
import com.gigpilot.dto.Dtos.RefreshRequest;
import com.gigpilot.dto.Dtos.RegisterRequest;
import com.gigpilot.dto.Dtos.ResetPasswordRequest;
import com.gigpilot.dto.Dtos.VerifyEmailRequest;
import com.gigpilot.security.AuthUser;
import com.gigpilot.service.AuthService;
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
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService auth;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageResponse register(@Valid @RequestBody RegisterRequest req) {
        auth.register(req);
        return new MessageResponse("User registered");
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) {
        return auth.login(req);
    }

    /** Exchanges a refresh token for a new access token and a rotated refresh token. */
    @PostMapping("/refresh")
    public LoginResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return auth.refresh(req.refreshToken());
    }

    @PostMapping("/logout")
    public MessageResponse logout(@Valid @RequestBody RefreshRequest req) {
        auth.logout(req.refreshToken());
        return new MessageResponse("Logged out");
    }

    @PostMapping("/logout-all")
    public MessageResponse logoutAll(@AuthenticationPrincipal AuthUser user) {
        auth.logoutAll(user);
        return new MessageResponse("Logged out of all devices");
    }

    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        auth.forgotPassword(req.email());
        return new MessageResponse("If that email exists, a reset token has been issued");
    }

    @PostMapping("/reset-password")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        auth.resetPassword(req.token(), req.password());
        return new MessageResponse("Password updated");
    }

    @PostMapping("/verify-email")
    public MessageResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest req) {
        auth.verifyEmail(req.token());
        return new MessageResponse("Email verified");
    }

    @PostMapping("/resend-verification")
    public MessageResponse resendVerification(@AuthenticationPrincipal AuthUser user) {
        auth.resendVerification(user);
        return new MessageResponse("Verification token issued");
    }
}
