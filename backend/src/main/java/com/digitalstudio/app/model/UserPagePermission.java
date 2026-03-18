package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "user_page_permissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPagePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "page_path", nullable = false)
    private String pagePath;

    @Column(name = "has_access", nullable = false)
    private boolean hasAccess;
}
