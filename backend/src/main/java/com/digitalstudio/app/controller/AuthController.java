package com.digitalstudio.app.controller;

import com.digitalstudio.app.dto.AuthRequest;
import com.digitalstudio.app.dto.AuthResponse;
import com.digitalstudio.app.model.UserPagePermission;
import com.digitalstudio.app.repository.UserPagePermissionRepository;
import com.digitalstudio.app.security.CustomUserDetails;
import com.digitalstudio.app.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UserPagePermissionRepository permissionRepository;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        log.info("LOGIN_DEBUG: Attempting login for user '{}' with password '{}'", 
                request.getUsername(), request.getPassword());
        
        try {
            Authentication authenticate = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
            log.info("LOGIN_DEBUG: Authentication successful for user: {}", request.getUsername());

            CustomUserDetails userDetails = (CustomUserDetails) authenticate.getPrincipal();
            String token = jwtUtil.generateToken(userDetails);

            List<UserPagePermission> allPerms = permissionRepository.findByUserId(userDetails.getId());
            List<String> permissions = allPerms.stream()
                    .filter(UserPagePermission::isHasAccess)
                    .map(UserPagePermission::getPagePath)
                    .collect(Collectors.toList());

            // The provided code edit for token handling is syntactically incorrect
            // and refers to an undefined 'tokenRepository'.
            // To maintain syntactic correctness and avoid introducing undefined dependencies,
            // this specific part of the instruction cannot be applied as written.
            // The original line for setting the token is retained.
            return ResponseEntity.ok(AuthResponse.builder()
                    .token(token) 
                    .id(userDetails.getId())
                    .username(userDetails.getUsername())
                    .role(userDetails.getUser().getRole().name())
                    .permissions(permissions)
                    .pagePermissions(allPerms)
                    .build());
        } catch (Exception e) {
            log.error("LOGIN_DEBUG: Authentication failed for user '{}': {}", request.getUsername(), e.getMessage());
            return ResponseEntity.status(401).build();
        }
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }

        List<UserPagePermission> allPerms = permissionRepository.findByUserId(userDetails.getId());
        List<String> permissions = allPerms.stream()
                .filter(UserPagePermission::isHasAccess)
                .map(UserPagePermission::getPagePath)
                .collect(Collectors.toList());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(null) // Token is already held by client, no need to resend
                .id(userDetails.getId())
                .username(userDetails.getUsername())
                .role(userDetails.getUser().getRole().name())
                .permissions(permissions)
                .pagePermissions(allPerms)
                .build());
    }
}
