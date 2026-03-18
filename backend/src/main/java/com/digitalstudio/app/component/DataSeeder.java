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
        if (userRepository.findByUsername("Jonty").isEmpty()) {
            User admin = User.builder()
                .username("Jonty")
                .password(passwordEncoder.encode("lion17007"))
                .role(Role.ADMIN)
                .build();
            admin = userRepository.save(admin);
            log.info("Created Admin User: Jonty");
            
            // Grant Admin access to everything
            for (String path : ALL_FRONTEND_PATHS) {
                permissionRepository.save(UserPagePermission.builder()
                    .userId(admin.getId())
                    .pagePath(path)
                    .hasAccess(true)
                    .build());
            }
        }

        // Seed User (Dona)
        if (userRepository.findByUsername("Dona").isEmpty()) {
            User user = User.builder()
                .username("Dona")
                .password(passwordEncoder.encode("Sarmistha@1995"))
                .role(Role.USER)
                .build();
            user = userRepository.save(user);
            log.info("Created Normal User: Dona");

            // Grant Dona access to common pages by default, but restrict sensitive ones
            for (String path : ALL_FRONTEND_PATHS) {
                boolean hasAccess = !path.equals("/configuration") && !path.equals("/logs") && !path.equals("/transactions");
                permissionRepository.save(UserPagePermission.builder()
                    .userId(user.getId())
                    .pagePath(path)
                    .hasAccess(hasAccess)
                    .build());
            }
        }
    }
}
