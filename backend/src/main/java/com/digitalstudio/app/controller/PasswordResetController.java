package com.digitalstudio.app.controller;

import com.digitalstudio.app.dto.ForgotPasswordRequest;
import com.digitalstudio.app.dto.ResetPasswordRequest;
import com.digitalstudio.app.model.PasswordResetToken;
import com.digitalstudio.app.model.User;
import com.digitalstudio.app.repository.PasswordResetTokenRepository;
import com.digitalstudio.app.repository.UserRepository;
import com.digitalstudio.app.service.EmailService;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class PasswordResetController {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @RequestBody ForgotPasswordRequest request,
            @RequestHeader(value = "Origin", required = false) String origin,
            HttpServletRequest httpRequest) {
        Optional<User> userOptional = userRepository.findByUsernameIgnoreCase(request.getUsername());

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            
            // Delete any existing token for this user
            tokenRepository.findByUser(user).ifPresent(tokenRepository::delete);

            // Generate new token
            String tokenValue = UUID.randomUUID().toString();
            PasswordResetToken token = PasswordResetToken.builder()
                    .token(tokenValue)
                    .user(user)
                    .expiryDate(LocalDateTime.now().plus(24, ChronoUnit.HOURS))
                    .build();
            if (token != null) {
                tokenRepository.save(token);
            }

            // Determine Base URL purely from Request
            String baseUrl = origin;
            if (baseUrl == null || baseUrl.isEmpty()) {
                // Construct from request if Origin is missing (e.g. same-origin or non-browser)
                String scheme = httpRequest.getScheme();
                String serverName = httpRequest.getServerName();
                int port = httpRequest.getServerPort();
                
                baseUrl = scheme + "://" + serverName;
                if (port != 80 && port != 443 && port != 8081) {
                    baseUrl += ":" + port;
                }
            }
            
            if (baseUrl != null && baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }

            // Construct reset link
            String resetLink = baseUrl + "/reset-password?token=" + tokenValue;
            String emailBody = "<h3>Password Reset Request</h3>" +
                    "<p>Click the link below to reset your password. This link will expire in 24 hours.</p>" +
                    "<p><a href=\"" + resetLink + "\">Reset Password Link</a></p>" +
                    "<p>If you did not request a password reset, please ignore this email.</p>";

            try {
                emailService.sendSimpleEmail(user.getEmail(), "Password Reset Request", emailBody);
            } catch (Exception e) {
                log.error("Failed to send reset email to {}", user.getEmail(), e);
                // Return success anyway in development so the user can see the link in the logs
                return ResponseEntity.ok(Map.of("message", "If an account exists with this username, a reset link has been sent to the associated email (check logs if email fails)."));
            }
        } else {
            log.warn("Forgot password request for non-existent username: {}", request.getUsername());
        }

        return ResponseEntity.ok(Map.of("message", "If an account exists with this username, a reset link has been sent to the associated email."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        Optional<PasswordResetToken> tokenOptional = tokenRepository.findByToken(request.getToken());

        if (tokenOptional.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired token."));
        }

        PasswordResetToken token = tokenOptional.get();
        if (token.isExpired()) {
            tokenRepository.delete(token);
            return ResponseEntity.badRequest().body(Map.of("message", "Reset link has expired."));
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Delete the token after successful reset
        tokenRepository.delete(token);

        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully. You can now log in."));
    }
}
