package com.gigpilot.security;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Sliding-window limiter, kept in memory (per instance). */
public class RateLimiter {
    private static final int PURGE_THRESHOLD = 10_000;

    private final int max;
    private final long windowMillis;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public RateLimiter(int max, Duration window) {
        this.max = max;
        this.windowMillis = window.toMillis();
    }

    public boolean tryAcquire(String key) {
        return tryAcquire(key, System.currentTimeMillis());
    }

    boolean tryAcquire(String key, long now) {
        if (hits.size() > PURGE_THRESHOLD) {
            purge(now);
        }
        Deque<Long> window = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() >= windowMillis) {
                window.pollFirst();
            }
            if (window.size() >= max) {
                return false;
            }
            window.addLast(now);
            return true;
        }
    }

    public long windowSeconds() {
        return Math.max(1, windowMillis / 1000);
    }

    private void purge(long now) {
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                Long newest = e.getValue().peekLast();
                return newest == null || now - newest >= windowMillis;
            }
        });
    }
}
