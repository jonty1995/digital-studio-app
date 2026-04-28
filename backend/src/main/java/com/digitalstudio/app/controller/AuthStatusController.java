package com.digitalstudio.app.controller;

import com.digitalstudio.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthStatusController {

    private final UserRepository userRepository;

    @GetMapping("/status")
    public ResponseEntity<?> getAuthStatus() {
        long userCount = userRepository.count();
        // If there are no users in the DB, it's a fresh deployment using in-memory admin.
        // We disable forgot password in this state.
        boolean isFreshDeployment = userCount == 0;
        
        return ResponseEntity.ok(Map.of(
            "isFreshDeployment", isFreshDeployment,
            "forgotPasswordEnabled", !isFreshDeployment
        ));
    }
}
