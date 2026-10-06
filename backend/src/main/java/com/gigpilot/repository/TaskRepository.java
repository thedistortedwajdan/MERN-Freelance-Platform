package com.gigpilot.repository;

import com.gigpilot.model.Task;
import com.gigpilot.model.TaskStatus;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

/**
 * The employer/freelancer fields are stored as ObjectIds, so queries are written
 * explicitly to make Spring Data convert the String ids accordingly.
 */
public interface TaskRepository extends MongoRepository<Task, String> {
    @Query("{ 'employer': ?0 }")
    List<Task> findByEmployer(String employerId, Sort sort);

    @Query("{ 'employer': ?0 }")
    List<Task> findByEmployer(String employerId);

    @Query("{ 'freelancer': ?0 }")
    List<Task> findByFreelancer(String freelancerId);

    @Query("{ 'employer': ?0, 'status': ?1 }")
    List<Task> findByEmployerAndStatus(String employerId, TaskStatus status, Sort sort);

    @Query("{ 'freelancer': ?0, 'status': ?1 }")
    List<Task> findByFreelancerAndStatus(String freelancerId, TaskStatus status, Sort sort);
}
