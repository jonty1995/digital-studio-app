package com.digitalstudio.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private Long id;
    private String username;
    private String role;
    private List<String> permissions;
    private List<com.digitalstudio.app.model.UserPagePermission> pagePermissions;
}
