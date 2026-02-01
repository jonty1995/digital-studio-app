package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@Table(name = "audit_log")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "entity_name")
    private String entityName;

    @Column(name = "entity_id")
    private String entityId;

    @Column(name = "action")
    private String action;

    @Column(name = "field_name")
    private String fieldName;

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
            modifiedBy = "Admin";
        }
    }
}
