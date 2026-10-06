package com.gigpilot.repository;

import com.gigpilot.model.SavedSearch;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SavedSearchRepository extends MongoRepository<SavedSearch, String> {
    List<SavedSearch> findByUser(String userId, Sort sort);

    long countByUser(String userId);
}
