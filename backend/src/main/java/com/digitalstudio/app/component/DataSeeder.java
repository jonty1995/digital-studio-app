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
    private final com.digitalstudio.app.repository.ValueConfigurationRepository configRepository;
    private final com.digitalstudio.app.repository.UserPagePermissionRepository permissionRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info(">>>> DATA SEEDER STARTING <<<<");
        try {
            // Seed Admin User
            long userCount = userRepository.count();
            if (userCount == 0) {
                log.info("No users found. Seeding default admin account...");
                com.digitalstudio.app.model.User admin = com.digitalstudio.app.model.User.builder()
                        .username("admin")
                        .password(passwordEncoder.encode("admin"))
                        .role(com.digitalstudio.app.model.Role.ADMIN)
                        .email("admin@digitalstudio.com")
                        .build();
                admin = userRepository.save(admin);
                seedPermissions(admin.getId());
            }

            // Seed Default Configurations
            seedConfiguration("FILE_DELETION_SCHEDULED_TIME", "02:00", "Daily cleanup time (24h format)");
            seedConfiguration("LAB_SYNC_INTERVAL", "300", "Interval in seconds to check for new lab files");

            log.info(">>>> DATA SEEDING COMPLETE <<<<");
        } catch (Exception e) {
            log.error("!!!! DATA SEEDER FAILED !!!!", e);
        }
    }

    private void seedConfiguration(String name, String value, String description) {
        if (!configRepository.existsById(name)) {
            com.digitalstudio.app.model.ValueConfiguration config = new com.digitalstudio.app.model.ValueConfiguration();
            config.setName(name);
            config.setValue(value);
            config.setDescription(description);
            configRepository.save(config);
            log.info("Seeded configuration: {} = {}", name, value);
        }
    }

    private void seedPermissions(Long userId) {
        String[] pages = {
            "/photo-orders", "/bill-payment", "/money-transfer", "/service-orders", 
            "/travel/train", "/customers", "/transactions", "/uploads", 
            "/lab-photo-process", "/configuration", "/admin/permissions",
            "/configuration/items", "/configuration/addons", "/configuration/pricing",
            "/configuration/services", "/configuration/accounts", "/configuration/values",
            "/configuration/audit"
        };

        for (String path : pages) {
            com.digitalstudio.app.model.UserPagePermission perm = new com.digitalstudio.app.model.UserPagePermission();
            perm.setUserId(userId);
            perm.setPagePath(path);
            perm.setHasAccess(true);
            
            // Root configuration path only needs access, CRUD is handled by sub-modules
            boolean isRootConfig = "/configuration".equals(path);
            perm.setCanAdd(!isRootConfig);
            perm.setCanEdit(!isRootConfig);
            perm.setCanDelete(!isRootConfig);
            
            permissionRepository.save(perm);
        }
        log.info("Seeded {} page permissions for admin user.", pages.length);
    }
}
