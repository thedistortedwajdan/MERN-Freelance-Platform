package com.gigpilot.repository;

import com.gigpilot.model.Dispute;
import com.gigpilot.model.DisputeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DisputeRepository extends MongoRepository<Dispute, String> {
    Page<Dispute> findByStatus(DisputeStatus status, Pageable pageable);

    @Query("{ $or: [ { 'openedBy': ?0 }, { 'against': ?0 } ] }")
    Page<Dispute> findInvolving(String userId, Pageable pageable);

    boolean existsByTaskAndStatus(String taskId, DisputeStatus status);

    long countByStatus(DisputeStatus status);
}
