package com.gigpilot.service;

import com.gigpilot.exception.ApiException;
import com.gigpilot.model.Task;
import com.gigpilot.repository.TaskRepository;
import com.gigpilot.security.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Shared task loading and participation checks. */
@Component
@RequiredArgsConstructor
public class TaskLookup {
    private final TaskRepository tasks;

    public Task require(String id) {
        Ids.require(id, "Task");
        return tasks.findById(id).orElseThrow(() -> ApiException.notFound("Task not found"));
    }

    public static boolean isEmployer(AuthUser user, Task task) {
        return user.id().equals(task.getEmployer());
    }

    public static boolean isAssignee(AuthUser user, Task task) {
        return task.getFreelancer() != null && user.id().equals(task.getFreelancer());
    }

    public static boolean isParticipant(AuthUser user, Task task) {
        return isEmployer(user, task) || isAssignee(user, task);
    }

    /** The other party on a task, or null when no freelancer is assigned. */
    public static String counterpart(AuthUser user, Task task) {
        return isEmployer(user, task) ? task.getFreelancer() : task.getEmployer();
    }
}
