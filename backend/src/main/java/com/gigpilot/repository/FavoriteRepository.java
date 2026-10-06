package com.gigpilot.repository;

import com.gigpilot.model.Favorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FavoriteRepository extends MongoRepository<Favorite, String> {
    Page<Favorite> findByUser(String userId, Pageable pageable);

    boolean existsByUserAndTask(String userId, String taskId);

    void deleteByUserAndTask(String userId, String taskId);

    void deleteByTask(String taskId);
}
