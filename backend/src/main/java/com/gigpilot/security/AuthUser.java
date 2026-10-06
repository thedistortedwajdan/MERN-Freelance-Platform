package com.gigpilot.security;

import com.gigpilot.model.Role;

/** The authenticated caller, built from the JWT claims. */
public record AuthUser(String id, Role role) {}
