package com.gigpilot.service;

import com.gigpilot.model.Role;
import com.gigpilot.model.User;
import com.gigpilot.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD (admins cannot self-register). */
@Component
public class AdminSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;
    private final String name;

    public AdminSeeder(
            UserRepository users,
            PasswordEncoder encoder,
            @Value("${app.admin.email}") String email,
            @Value("${app.admin.password}") String password,
            @Value("${app.admin.name}") String name) {
        this.users = users;
        this.encoder = encoder;
        this.email = email;
        this.password = password;
        this.name = name;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            return;
        }
        if (users.findByEmail(email).isPresent()) {
            return;
        }
        User admin = new User();
        admin.setName(name);
        admin.setEmail(email);
        admin.setPassword(encoder.encode(password));
        admin.setRole(Role.admin);
        admin.setEmailVerified(true);
        users.save(admin);
        log.info("Created admin account {}", email);
    }
}
