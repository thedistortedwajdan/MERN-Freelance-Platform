package com.gigpilot.model;

/** Lowercase constants match the values stored in MongoDB and sent by the frontend. */
public enum TaskStatus {
    open, assigned, submitted, completed, cancelled, expired
}
