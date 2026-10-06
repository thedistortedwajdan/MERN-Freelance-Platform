package com.gigpilot.repository;

import com.gigpilot.model.Message;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MessageRepository extends MongoRepository<Message, String> {
    long countByRecipientAndReadAtIsNull(String recipientId);

    long countByTaskAndRecipientAndReadAtIsNull(String taskId, String recipientId);

    Optional<Message> findFirstByTaskOrderByIdDesc(String taskId);

    void deleteByTask(String taskId);
}
