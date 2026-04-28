package com.digitalstudio.app.security;

import com.digitalstudio.app.model.User;
import com.digitalstudio.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.digitalstudio.app.model.Role;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.context.annotation.Lazy;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public CustomUserDetailsService(UserRepository userRepository, @Lazy PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // 1. Check if DB is empty
        long userCount = userRepository.count();
        
        if (userCount == 0) {
            if ("admin".equalsIgnoreCase(username)) {
                // Return in-memory admin user
                User admin = User.builder()
                        .id(-1L) // Synthetic ID
                        .username("admin")
                        .password(passwordEncoder.encode("admin"))
                        .role(Role.ADMIN)
                        .email("admin@digitalstudio.com")
                        .build();
                return new CustomUserDetails(admin);
            }
            throw new UsernameNotFoundException("No users found in system. Use default 'admin' credentials.");
        }

        // 2. Normal DB lookup
        User user = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        return new CustomUserDetails(user);
    }
}
