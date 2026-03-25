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
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
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
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        log.info("Processing forgot-password for email: {}", request.getEmail());
        Optional<User> userOptional = userRepository.findByEmail(request.getEmail());

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            
            // Delete any existing token for this user
            tokenRepository.findByUser(user).ifPresent(tokenRepository::delete);

            // Generate new token
            String tokenValue = UUID.randomUUID().toString();
            PasswordResetToken token = PasswordResetToken.builder()
                    .token(tokenValue)
                    .user(user)
                    .expiryDate(LocalDateTime.now().plusHours(24))
                    .build();
            if (token != null) {
                tokenRepository.save(token);
            }

            // Send email
            String resetLink = "http://localhost:5173/reset-password?token=" + tokenValue;
            String emailBody = "<h3>Password Reset Request</h3>" +
                    "<p>Click the link below to reset your password. This link will expire in 24 hours.</p>" +
                    "<p><a href=\"" + resetLink + "\">Reset Password Link</a></p>" +
                    "<p>If you did not request a password reset, please ignore this email.</p>";

            try {
                emailService.sendSimpleEmail(user.getEmail(), "Password Reset Request", emailBody);
                log.info("Reset email sent to: {}", user.getEmail());
            } catch (MessagingException e) {
                log.error("Failed to send reset email to {}", user.getEmail(), e);
                return ResponseEntity.internalServerError().body(Map.of("message", "Failed to send email. Please try again later."));
            }
        } else {
            log.warn("Forgot password request for non-existent email: {}", request.getEmail());
            // Security best practice: don't reveal if user exists, but here we can return success for simplicity if needed
        }

        return ResponseEntity.ok(Map.of("message", "If an account exists with this email, a reset link has been sent."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        log.info("Processing reset-password for token: {}", request.getToken());
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

        log.info("Password successfully reset for user: {}", user.getUsername());
        return ResponseEntity.ok(Map.of("message", "Password has been reset successfully. You can now log in."));
    }
}
