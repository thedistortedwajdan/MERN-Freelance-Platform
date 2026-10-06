package com.gigpilot.service;

import static org.springframework.data.mongodb.core.query.Criteria.where;
import static org.springframework.data.mongodb.core.query.Query.query;

import com.gigpilot.exception.ApiException;
import com.gigpilot.model.AccountStatus;
import com.gigpilot.model.RefreshToken;
import com.gigpilot.model.User;
import com.gigpilot.repository.RefreshTokenRepository;
import com.gigpilot.repository.UserRepository;
import com.gigpilot.util.Tokens;
import java.time.Duration;
import java.time.Instant;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/** Rotating, revocable refresh tokens. Only SHA-256 hashes are stored. */
@Service
public class RefreshTokenService {
    public record Rotated(User user, String refreshToken) {}

    private final RefreshTokenRepository tokens;
    private final UserRepository users;
    private final MongoTemplate mongo;
    private final Duration ttl;

    public RefreshTokenService(
            RefreshTokenRepository tokens,
            UserRepository users,
            MongoTemplate mongo,
            @Value("${app.jwt.refresh-days}") long refreshDays) {
        this.tokens = tokens;
        this.users = users;
        this.mongo = mongo;
        this.ttl = Duration.ofDays(refreshDays);
    }

    public String issue(User user) {
        String raw = Tokens.random();
        RefreshToken token = new RefreshToken();
        token.setUser(user.getId());
        token.setTokenHash(Tokens.hash(raw));
        token.setExpiresAt(Instant.now().plus(ttl));
        tokens.save(token);
        return raw;
    }

    /** Exchanges a valid refresh token for a new one. Presenting a revoked token revokes the whole family. */
    public Rotated rotate(String raw) {
        RefreshToken token = tokens.findByTokenHash(Tokens.hash(raw))
                .orElseThrow(() -> ApiException.unauthorized("Invalid refresh token"));
        if (token.isRevoked()) {
            revokeAll(token.getUser());
            throw ApiException.unauthorized("Invalid refresh token");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.unauthorized("Refresh token expired");
        }
        User user = users.findById(token.getUser())
                .orElseThrow(() -> ApiException.unauthorized("Invalid refresh token"));
        if (user.getStatus() == AccountStatus.suspended) {
            throw ApiException.forbidden("Account suspended");
        }
        token.setRevoked(true);
        tokens.save(token);
        return new Rotated(user, issue(user));
    }

    public void revoke(String raw) {
        tokens.findByTokenHash(Tokens.hash(raw)).ifPresent(t -> {
            t.setRevoked(true);
            tokens.save(t);
        });
    }

    public void revokeAll(String userId) {
        mongo.updateMulti(
                query(where("user").is(new ObjectId(userId)).and("revoked").is(false)),
                new Update().set("revoked", true),
                RefreshToken.class);
    }
}
