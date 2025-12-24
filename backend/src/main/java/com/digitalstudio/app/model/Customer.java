package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "customers")
public class Customer {
    @Id
    @Column(name = "customer_id")
    private Long id;

    private String name;

    private String mobile;

    @Column(columnDefinition = "TEXT")
    private String editHistoryJson;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
