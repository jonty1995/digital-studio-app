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
    @GeneratedValue(strategy = GenerationType.UUID)
    private java.util.UUID orderId;

    @ManyToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "customer_id", columnDefinition = "BIGINT")
    private Customer customer;

    private String uploadId;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String status;
    private Boolean isInstant;

    @Column(columnDefinition = "TEXT")
    private String itemsJson;

    @Column(columnDefinition = "TEXT")
    private String statusHistoryJson;

    @CreationTimestamp
    @Column(nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
    @Transient
    private String originalFilename;

    @Transient
    private Boolean isFileAvailable;
}
