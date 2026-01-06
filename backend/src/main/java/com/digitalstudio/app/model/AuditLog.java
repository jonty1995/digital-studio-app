package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "audit_log")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_name")
    private String entityName; // e.g. "PhotoItem", "Addon"

    @Column(name = "entity_id")
    private String entityId; // String to accommodate various ID types

    @Column(name = "action")
    private String action; // CREATE, UPDATE, DELETE

    @Column(name = "field_name")
    private String fieldName; // Optional, for granular field updates

    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    @Column(name = "modified_by")
    private String modifiedBy;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
        if (modifiedBy == null) {
            modifiedBy = "Admin"; // Default user for now
        }
    }
}
