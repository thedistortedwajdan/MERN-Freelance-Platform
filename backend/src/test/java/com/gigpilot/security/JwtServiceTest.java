package com.gigpilot.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.gigpilot.model.Role;
import com.gigpilot.model.User;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

class JwtServiceTest {
    private static final String SECRET = "0123456789abcdef0123456789abcdef";

    private static User user() {
        User user = new User();
        user.setId("665f1c2e8f1b2a0012345678");
        user.setRole(Role.freelancer);
        return user;
    }

    @Test
    void roundTripsIdAndRole() {
        JwtService jwt = new JwtService(SECRET, 30);
        AuthUser parsed = jwt.parse(jwt.generate(user()));
        assertEquals("665f1c2e8f1b2a0012345678", parsed.id());
        assertEquals(Role.freelancer, parsed.role());
    }

    @Test
    void rejectsTokenSignedWithAnotherSecret() {
        String token = new JwtService("ffffffffffffffffffffffffffffffff", 30).generate(user());
        assertThrows(JwtException.class, () -> new JwtService(SECRET, 30).parse(token));
    }

    @Test
    void rejectsExpiredToken() {
        String token = new JwtService(SECRET, -1).generate(user());
        assertThrows(JwtException.class, () -> new JwtService(SECRET, 30).parse(token));
    }

    @Test
    void refusesShortSecret() {
        assertThrows(IllegalStateException.class, () -> new JwtService("short", 30));
    }
}
