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
public class UserController {

    private final UserRepository userRepository;
    private final UserPagePermissionRepository permissionRepository;
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
        
        log.info("Updating permissions for user ID: {}", userId);
        
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
        log.info("Resetting password for user ID: {}", userId);
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
        log.info("Updating user ID: {}", userId);
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
        log.info("Creating new user");
        String username = request.get("username");
        String password = request.get("password");
        String email = request.get("email");
        String roleStr = request.getOrDefault("role", "USER");

        if (username == null || username.trim().isEmpty() || password == null || password.trim().length() < 5) {
            log.warn("Invalid user creation request: username={}, (password hidden)", username);
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
            savedUser.setPassword(null);
            return ResponseEntity.ok(savedUser);
        } catch (Exception e) {
            log.error("Error creating user: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
