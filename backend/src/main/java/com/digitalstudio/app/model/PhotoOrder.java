package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "photo_orders")
public class PhotoOrder {
    @Id
    private Long orderId; // Timestamp based

    private Long customerId;
    private Long uploadId;
    private Long paymentId;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String status;
    private Boolean isInstant;

    @Column(columnDefinition = "TEXT")
    private String itemsJson;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
