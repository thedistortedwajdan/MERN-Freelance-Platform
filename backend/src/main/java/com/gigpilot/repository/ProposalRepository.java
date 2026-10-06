package com.gigpilot.repository;

import com.gigpilot.model.Proposal;
import com.gigpilot.model.ProposalStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProposalRepository extends MongoRepository<Proposal, String> {
    List<Proposal> findByTask(String taskId, Sort sort);

    List<Proposal> findByFreelancer(String freelancerId, Sort sort);

    List<Proposal> findByTaskAndStatus(String taskId, ProposalStatus status);

    Optional<Proposal> findByTaskAndFreelancer(String taskId, String freelancerId);

    void deleteByTask(String taskId);
}
