package com.gigpilot.repository;

import com.gigpilot.model.VerificationToken;
import com.gigpilot.model.TokenType;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface VerificationTokenRepository extends MongoRepository<VerificationToken, String> {
    Optional<VerificationToken> findByTokenHash(String tokenHash);

    void deleteByUserAndType(String userId, TokenType type);
}
