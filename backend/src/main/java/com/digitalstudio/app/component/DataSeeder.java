package com.digitalstudio.app.component;

import com.digitalstudio.app.model.Role;
import com.digitalstudio.app.model.User;
import com.digitalstudio.app.model.UserPagePermission;
import com.digitalstudio.app.repository.UserRepository;
import com.digitalstudio.app.repository.UserPagePermissionRepository;
import com.digitalstudio.app.repository.ValueConfigurationRepository;
import com.digitalstudio.app.model.ValueConfiguration;
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
    private final ValueConfigurationRepository configRepository;
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
        seedEmailConfig();
        log.info("Data Seeding Complete.");
    }

    private void seedEmailConfig() {
        String[][] configs = {
            {"EMAIL_HOST", "smtp.gmail.com", "SMTP server address (e.g., smtp.gmail.com)"},
            {"EMAIL_PORT", "587", "SMTP server port (e.g., 587 or 465)"},
            {"EMAIL_USERNAME", "jontysadhukhan@gmail.com", "System sender email address"},
            {"EMAIL_PASSWORD", "", "App Password (NOT your regular Gmail password)"},
            {"EMAIL_SENDER_NAME", "Digital Studio", "Name displayed in outgoing emails"}
        };

        for (String[] c : configs) {
            if (!configRepository.existsById(c[0])) {
                ValueConfiguration vc = new ValueConfiguration();
                vc.setName(c[0]);
                vc.setValue(c[1]);
                vc.setDescription(c[2]);
                configRepository.save(vc);
                log.info("SEEDER: Created Configuration: {}", c[0]);
            }
        }
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
            log.info("SEEDER: Admin User: Jonty already exists. Skipping creation.");
        }

        // Cleanup duplicate "jonty" (lowercase) if it exists and is different from "Jonty"
        final Long jontyId = jonty.getId();
        userRepository.findByUsername("jonty").ifPresent(u -> {
            if (!u.getId().equals(jontyId)) {
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
