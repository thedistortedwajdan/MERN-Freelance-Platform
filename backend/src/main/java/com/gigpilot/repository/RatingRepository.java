package com.gigpilot.repository;

import com.gigpilot.model.Rating;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

public interface RatingRepository extends MongoRepository<Rating, String> {
    @Query("{ 'to': ?0 }")
    List<Rating> findByRecipient(String userId, Sort sort);
}
