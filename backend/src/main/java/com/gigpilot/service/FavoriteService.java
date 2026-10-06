package com.gigpilot.service;

import com.gigpilot.dto.Dtos.TaskView;
import com.gigpilot.exception.ApiException;
import com.gigpilot.model.Favorite;
import com.gigpilot.model.Task;
import com.gigpilot.repository.FavoriteRepository;
import com.gigpilot.repository.TaskRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FavoriteService {
    private final FavoriteRepository favorites;
    private final TaskRepository tasks;
    private final TaskLookup lookup;
    private final ViewMapper mapper;

    public void add(String userId, String taskId) {
        Task task = lookup.require(taskId);
        if (task.isHidden()) {
            throw ApiException.notFound("Task not found");
        }
        if (favorites.existsByUserAndTask(userId, taskId)) {
            return;
        }
        Favorite favorite = new Favorite();
        favorite.setUser(userId);
        favorite.setTask(taskId);
        try {
            favorites.save(favorite);
        } catch (DuplicateKeyException ignored) {
            // saved concurrently
        }
    }

    public void remove(String userId, String taskId) {
        Ids.require(taskId, "Task");
        favorites.deleteByUserAndTask(userId, taskId);
    }

    /** Saved tasks, most recently saved first. Hidden or deleted tasks are skipped. */
    public Page<TaskView> list(String userId, Pageable pageable) {
        Page<Favorite> page = favorites.findByUser(userId, pageable);
        Map<String, Task> byId = tasks.findAllById(page.getContent().stream().map(Favorite::getTask).toList()).stream()
                .collect(Collectors.toMap(Task::getId, Function.identity()));
        List<Task> ordered = page.getContent().stream()
                .map(f -> byId.get(f.getTask()))
                .filter(t -> t != null && !t.isHidden())
                .toList();
        return new PageImpl<>(mapper.tasks(ordered), pageable, page.getTotalElements());
    }
}
