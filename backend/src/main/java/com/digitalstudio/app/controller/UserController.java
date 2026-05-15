package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.User;
import com.digitalstudio.app.model.UserPagePermission;
import com.digitalstudio.app.repository.UserPagePermissionRepository;
import com.digitalstudio.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserRepository userRepository;
    private final UserPagePermissionRepository permissionRepository;
    private final com.digitalstudio.app.repository.PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/{userId}/permissions")
    public ResponseEntity<List<UserPagePermission>> getUserPermissions(@PathVariable Long userId) {
        return ResponseEntity.ok(permissionRepository.findByUserId(userId));
    }

    @PutMapping("/{userId}/permissions")
    public ResponseEntity<List<UserPagePermission>> updateUserPermissions(
            @PathVariable Long userId,
            @RequestBody List<UserPagePermission> newPermissions) {
        
        // Ensure the permissions belong to the specified user
        newPermissions.forEach(p -> p.setUserId(userId));
        
        // This is a simple overwrite approach. For robust apps, identify changes and update existing rows.
        List<UserPagePermission> existing = permissionRepository.findByUserId(userId);
        
        Map<String, UserPagePermission> existingMap = existing.stream()
                .collect(Collectors.toMap(UserPagePermission::getPagePath, p -> p));

        for (UserPagePermission newPerm : newPermissions) {
            UserPagePermission existingPerm = existingMap.get(newPerm.getPagePath());
            if (existingPerm != null) {
                existingPerm.setHasAccess(newPerm.isHasAccess());
                existingPerm.setCanAdd(newPerm.isCanAdd());
                existingPerm.setCanEdit(newPerm.isCanEdit());
                existingPerm.setCanDelete(newPerm.isCanDelete());
                permissionRepository.save(existingPerm);
            } else {
                permissionRepository.save(newPerm);
            }
        }
        
        return ResponseEntity.ok(permissionRepository.findByUserId(userId));
    }

    @PutMapping("/{userId}/password")
    public ResponseEntity<Void> resetPassword(@PathVariable Long userId, @RequestBody Map<String, String> request) {
        String newPassword = request.get("newPassword");
        
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
                    
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Error resetting password for user {}: {}", userId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/{userId}")
    public ResponseEntity<User> updateUser(@PathVariable Long userId, @RequestBody Map<String, String> request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String username = request.get("username");
        String email = request.get("email");
        String roleStr = request.get("role");

        if (username != null && !username.trim().isEmpty()) {
            user.setUsername(username);
        }
        if (email != null && !email.trim().isEmpty()) {
            user.setEmail(email);
        }
        if (roleStr != null) {
            try {
                user.setRole(com.digitalstudio.app.model.Role.valueOf(roleStr));
            } catch (IllegalArgumentException e) {
                // Keep existing role
            }
        }

        User savedUser = userRepository.save(user);
        savedUser.setPassword(null);
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        String email = request.get("email");
        String roleStr = request.getOrDefault("role", "USER");

        if (username == null || username.trim().isEmpty() || 
            password == null || password.trim().length() < 5 ||
            email == null || email.trim().isEmpty()) {
            log.warn("Invalid user creation request: username={}, email={}, (password hidden)", username, email);
            return ResponseEntity.badRequest().build();
        }

        if (userRepository.findByUsernameIgnoreCase(username).isPresent()) {
            log.warn("User already exists: {}", username);
            return ResponseEntity.status(409).body(null); // Conflict
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setEmail(email);

        
        try {
            user.setRole(com.digitalstudio.app.model.Role.valueOf(roleStr));
        } catch (IllegalArgumentException e) {
            user.setRole(com.digitalstudio.app.model.Role.USER);
        }

        try {
            User savedUser = userRepository.save(user);
            seedDefaultPermissions(savedUser.getId());
            savedUser.setPassword(null);
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            log.error("Error creating user: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    private void seedDefaultPermissions(Long userId) {
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
    }

    @DeleteMapping("/{userId}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<Void> deleteUser(
            @PathVariable Long userId, 
            @org.springframework.security.core.annotation.AuthenticationPrincipal com.digitalstudio.app.security.CustomUserDetails currentUser) {
        
        log.info("Request to delete user ID: {}", userId);
        
        // Safety: Don't allow deleting yourself
        if (currentUser != null && userId.equals(currentUser.getId())) {
            log.warn("Security Alert: User {} tried to delete their own account.", userId);
            return ResponseEntity.badRequest().build();
        }

        try {
            User userToDelete = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // 1. Delete associated password reset tokens
            tokenRepository.deleteByUser(userToDelete);

            // 2. Delete associated permissions
            permissionRepository.deleteByUserId(userId);

            // 3. Delete the user record
            userRepository.deleteById(userId);
            
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Failed to delete user {}: {}", userId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
