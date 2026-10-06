package com.gigpilot.service;

import com.gigpilot.dto.Dtos.LoginRequest;
import com.gigpilot.dto.Dtos.LoginResponse;
import com.gigpilot.dto.Dtos.LoginUser;
import com.gigpilot.dto.Dtos.RegisterRequest;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.AccountStatus;
import com.gigpilot.model.Role;
import com.gigpilot.model.TokenType;
import com.gigpilot.model.User;
import com.gigpilot.model.VerificationToken;
import com.gigpilot.repository.UserRepository;
import com.gigpilot.repository.VerificationTokenRepository;
import com.gigpilot.security.AuthUser;
import com.gigpilot.security.JwtService;
import com.gigpilot.util.Tokens;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {
    private static final Duration VERIFY_TTL = Duration.ofDays(2);
    private static final Duration RESET_TTL = Duration.ofHours(1);

    private final UserRepository users;
    private final VerificationTokenRepository verificationTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final RefreshTokenService refreshTokens;
    private final TokenDelivery delivery;

    public void register(RegisterRequest req) {
        if (req.role() == Role.admin) {
            throw ApiException.badRequest("Invalid role");
        }
        if (users.findByEmail(req.email()).isPresent()) {
            throw ApiException.badRequest("Email already in use");
        }
        User user = new User();
        user.setName(req.name().trim());
        user.setEmail(req.email());
        user.setPassword(encoder.encode(req.password()));
        user.setRole(req.role());
        try {
            users.save(user);
        } catch (DuplicateKeyException e) {
            throw ApiException.badRequest("Email already in use");
        }
        issueToken(user, TokenType.email_verification, VERIFY_TTL);
    }

    public LoginResponse login(LoginRequest req) {
        User user = users.findByEmail(req.email()).orElseThrow(() -> ApiException.badRequest("User not found"));
        if (!encoder.matches(req.password(), user.getPassword())) {
            throw ApiException.badRequest("Invalid credentials");
        }
        if (user.getStatus() == AccountStatus.suspended) {
            throw ApiException.forbidden("Account suspended");
        }
        return session(user, refreshTokens.issue(user));
    }

    public LoginResponse refresh(String refreshToken) {
        RefreshTokenService.Rotated rotated = refreshTokens.rotate(refreshToken);
        return session(rotated.user(), rotated.refreshToken());
    }

    public void logout(String refreshToken) {
        refreshTokens.revoke(refreshToken);
    }

    public void logoutAll(AuthUser user) {
        refreshTokens.revokeAll(user.id());
    }

    /** Always succeeds from the caller's point of view, so it cannot be used to discover accounts. */
    public void forgotPassword(String email) {
        users.findByEmail(email).ifPresent(user -> issueToken(user, TokenType.password_reset, RESET_TTL));
    }

    public void resetPassword(String rawToken, String newPassword) {
        VerificationToken token = consume(rawToken, TokenType.password_reset);
        User user = users.findById(token.getUser()).orElseThrow(() -> ApiException.badRequest("Invalid or expired token"));
        user.setPassword(encoder.encode(newPassword));
        users.save(user);
        refreshTokens.revokeAll(user.getId());
    }

    public void verifyEmail(String rawToken) {
        VerificationToken token = consume(rawToken, TokenType.email_verification);
        User user = users.findById(token.getUser()).orElseThrow(() -> ApiException.badRequest("Invalid or expired token"));
        user.setEmailVerified(true);
        users.save(user);
    }

    public void resendVerification(AuthUser auth) {
        User user = users.findById(auth.id()).orElseThrow(() -> ApiException.notFound("User not found"));
        if (user.isEmailVerified()) {
            throw ApiException.badRequest("Email already verified");
        }
        issueToken(user, TokenType.email_verification, VERIFY_TTL);
    }

    private LoginResponse session(User user, String refreshToken) {
        return new LoginResponse(
                jwt.generate(user),
                refreshToken,
                new LoginUser(user.getId(), user.getId(), user.getName(), user.getRole()));
    }

    private void issueToken(User user, TokenType type, Duration ttl) {
        verificationTokens.deleteByUserAndType(user.getId(), type);
        String raw = Tokens.random();
        VerificationToken token = new VerificationToken();
        token.setUser(user.getId());
        token.setType(type);
        token.setTokenHash(Tokens.hash(raw));
        token.setExpiresAt(Instant.now().plus(ttl));
        verificationTokens.save(token);
        delivery.deliver(user, type, raw);
    }

    private VerificationToken consume(String raw, TokenType type) {
        VerificationToken token = verificationTokens.findByTokenHash(Tokens.hash(raw))
                .filter(t -> t.getType() == type && !t.isUsed() && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> ApiException.badRequest("Invalid or expired token"));
        token.setUsed(true);
        verificationTokens.save(token);
        return token;
    }
}
