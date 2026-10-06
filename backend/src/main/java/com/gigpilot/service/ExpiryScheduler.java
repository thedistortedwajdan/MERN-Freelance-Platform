package com.gigpilot.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Periodically expires open tasks that passed their deadline. */
@Component
@RequiredArgsConstructor
public class ExpiryScheduler {
    private static final Logger log = LoggerFactory.getLogger(ExpiryScheduler.class);

    private final TaskService tasks;

    @Scheduled(fixedDelayString = "${app.expiry.interval-ms}", initialDelay = 60_000)
    public void expireOverdueTasks() {
        try {
            int expired = tasks.expireOverdue();
            if (expired > 0) {
                log.info("Expired {} overdue task(s)", expired);
            }
        } catch (RuntimeException e) {
            log.error("Task expiry job failed", e);
        }
    }
}
