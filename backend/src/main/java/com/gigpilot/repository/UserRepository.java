package com.gigpilot.repository;

import com.gigpilot.model.User;
import com.gigpilot.model.Role;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);

    List<User> findByRole(Role role);

    long countByRole(Role role);
}
