package com.gigpilot.service;

import com.gigpilot.model.TokenType;
import com.gigpilot.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Placeholder delivery: there is no mailer yet, so tokens are only written to the log, and only when
 * {@code app.auth.log-tokens} is on (development).
 */
@Component
public class LoggingTokenDelivery implements TokenDelivery {
    private static final Logger log = LoggerFactory.getLogger(LoggingTokenDelivery.class);

    private final boolean logTokens;

    public LoggingTokenDelivery(@Value("${app.auth.log-tokens}") boolean logTokens) {
        this.logTokens = logTokens;
    }

    @Override
    public void deliver(User user, TokenType type, String rawToken) {
        if (logTokens) {
            log.info("[DEV] {} token for {}: {}", type, user.getEmail(), rawToken);
        } else {
            log.info("{} token issued for user {} (no delivery channel configured)", type, user.getId());
        }
    }
}
