package com.gigpilot.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class RateLimiterTest {
    @Test
    void blocksAfterMaxAndRecoversWhenTheWindowPasses() {
        RateLimiter limiter = new RateLimiter(3, Duration.ofSeconds(60));
        long t0 = 1_000_000L;

        assertTrue(limiter.tryAcquire("ip", t0));
        assertTrue(limiter.tryAcquire("ip", t0 + 1));
        assertTrue(limiter.tryAcquire("ip", t0 + 2));
        assertFalse(limiter.tryAcquire("ip", t0 + 3));

        assertTrue(limiter.tryAcquire("ip", t0 + 60_001));
    }

    @Test
    void keysAreIndependent() {
        RateLimiter limiter = new RateLimiter(1, Duration.ofSeconds(60));
        assertTrue(limiter.tryAcquire("a", 0));
        assertFalse(limiter.tryAcquire("a", 1));
        assertTrue(limiter.tryAcquire("b", 1));
    }
}
