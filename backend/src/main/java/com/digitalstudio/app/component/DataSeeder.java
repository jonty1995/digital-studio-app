package com.digitalstudio.app.component;

import com.digitalstudio.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Running Data Seeder...");
        // No longer seeding users or configurations.
        // admin/admin will be handled as an in-memory fallback in CustomUserDetailsService 
        // ONLY if the user table is empty.
        log.info("Data Seeding Complete (No-op).");
    }
}
