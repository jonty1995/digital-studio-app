package com.digitalstudio.app.component;

import com.digitalstudio.app.model.Role;
import com.digitalstudio.app.model.User;
import com.digitalstudio.app.model.UserPagePermission;
import com.digitalstudio.app.repository.UserRepository;
import com.digitalstudio.app.repository.UserPagePermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final UserPagePermissionRepository permissionRepository;
    private final PasswordEncoder passwordEncoder;

    // List of all protectable frontend paths
    private static final List<String> ALL_FRONTEND_PATHS = Arrays.asList(
        "/photo-orders",
        "/lab-photo-process",
        "/bill-payment",
        "/money-transfer",
        "/service-orders",
        "/customers",
        "/transactions",
        "/uploads",
        "/configuration",
        "/logs"
    );

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Running Data Seeder...");
        seedUsers();
        log.info("Data Seeding Complete.");
    }

    private void seedUsers() {
        // Seed Admin (Jonty)
        User jonty = userRepository.findByUsernameIgnoreCase("Jonty").orElse(null);
        if (jonty == null) {
            jonty = User.builder()
                .username("Jonty")
                .email("jontysadhukhan@gmail.com")
                .password(passwordEncoder.encode("lion17007"))
                .role(Role.ADMIN)
                .build();
            jonty = userRepository.save(jonty);
            log.info("SEEDER: Created Admin User: Jonty");
            
            // Grant Admin access to everything
            for (String path : ALL_FRONTEND_PATHS) {
                permissionRepository.save(UserPagePermission.builder()
                    .userId(jonty.getId())
                    .pagePath(path)
                    .hasAccess(true)
                    .build());
            }
        } else {
            // Ensure Jonty has admin role and correct email
            boolean updated = false;
            if (jonty.getRole() != Role.ADMIN) {
                jonty.setRole(Role.ADMIN);
                updated = true;
            }
            if (!"jontysadhukhan@gmail.com".equals(jonty.getEmail())) {
                jonty.setEmail("jontysadhukhan@gmail.com");
                updated = true;
            }
            // Force password reset to default for now as requested
            jonty.setPassword(passwordEncoder.encode("lion17007"));
            updated = true;

            if (updated) {
                userRepository.save(jonty);
                log.info("SEEDER: Updated Admin User: Jonty (Password/Email/Role)");
            }
        }

        // Cleanup duplicate "jonty" (lowercase) if it exists and is different from "Jonty"
        userRepository.findByUsername("jonty").ifPresent(u -> {
            if (!u.getId().equals(jonty.getId())) {
                log.info("SEEDER: Removing legacy lowercase 'jonty' user");
                permissionRepository.deleteByUserId(u.getId());
                userRepository.delete(u);
            }
        });

        // Seed User (Dona)
        User dona = userRepository.findByUsernameIgnoreCase("Dona").orElse(null);
        if (dona == null) {
            dona = User.builder()
                .username("Dona")
                .email("dona@digitalstudio.com")
                .password(passwordEncoder.encode("dona9355"))
                .role(Role.USER)
                .build();
            dona = userRepository.save(dona);
            log.info("SEEDER: Created Standard User: Dona");

            for (String path : ALL_FRONTEND_PATHS) {
                boolean hasAccess = !path.equals("/configuration") && !path.equals("/logs") && !path.equals("/transactions");
                permissionRepository.save(UserPagePermission.builder()
                    .userId(dona.getId())
                    .pagePath(path)
                    .hasAccess(hasAccess)
                    .build());
            }
        } else {
            if (dona.getEmail() == null || dona.getEmail().isEmpty()) {
                dona.setEmail("dona@digitalstudio.com");
                userRepository.save(dona);
                log.info("SEEDER: Updated Email for User: Dona");
            }
        }
    }
}
