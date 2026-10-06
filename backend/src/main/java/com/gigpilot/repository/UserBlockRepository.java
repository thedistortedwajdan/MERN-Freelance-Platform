package com.gigpilot.repository;

import com.gigpilot.model.UserBlock;
import java.util.List;
import org.springframework.data.mongodb.repository.ExistsQuery;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserBlockRepository extends MongoRepository<UserBlock, String> {
    List<UserBlock> findByBlocker(String blockerId);

    boolean existsByBlockerAndBlocked(String blockerId, String blockedId);

    void deleteByBlockerAndBlocked(String blockerId, String blockedId);

    @ExistsQuery("{ $or: [ { 'blocker': ?0, 'blocked': ?1 }, { 'blocker': ?1, 'blocked': ?0 } ] }")
    boolean existsBetween(String a, String b);
}
