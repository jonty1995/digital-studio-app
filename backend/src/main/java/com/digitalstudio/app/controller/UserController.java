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
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
                
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody Map<String, String> request) {
        log.info("Creating new user");
        String username = request.get("username");
        String password = request.get("password");
        String roleStr = request.getOrDefault("role", "USER");

        if (username == null || username.trim().isEmpty() || password == null || password.trim().length() < 5) {
            return ResponseEntity.badRequest().build();
        }

        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        
        try {
            user.setRole(com.digitalstudio.app.model.Role.valueOf(roleStr));
        } catch (IllegalArgumentException e) {
            user.setRole(com.digitalstudio.app.model.Role.USER);
        }

        User savedUser = userRepository.save(user);
        
        // Don't leak the encoded password back in the response
        savedUser.setPassword(null);

        return ResponseEntity.ok(savedUser);
    }
}
