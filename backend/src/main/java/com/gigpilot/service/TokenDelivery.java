package com.gigpilot.service;

import com.gigpilot.model.TokenType;
import com.gigpilot.model.User;

/** How one-time tokens reach a user. Swap the implementation when a mailer is added. */
public interface TokenDelivery {
    void deliver(User user, TokenType type, String rawToken);
}
