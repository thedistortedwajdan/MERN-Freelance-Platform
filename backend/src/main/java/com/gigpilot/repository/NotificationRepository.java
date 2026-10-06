package com.gigpilot.repository;

import com.gigpilot.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface NotificationRepository extends MongoRepository<Notification, String> {
    Page<Notification> findByUser(String userId, Pageable pageable);

    Page<Notification> findByUserAndReadFalse(String userId, Pageable pageable);

    long countByUserAndReadFalse(String userId);
}
