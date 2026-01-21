package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Data
@Table(name = "service_orders")
public class ServiceOrder {
    @Id
    private Long id;

    @ManyToOne
    @JoinColumn(name = "customer_id")
    private Customer customer;

    private String serviceName;
    private Double amount;

    @Column(columnDefinition = "TEXT")
    private String description;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    private String status; // Pending, Done, Failed, Discarded

    @Column(columnDefinition = "TEXT")
    private String statusHistoryJson;

    @Column(columnDefinition = "TEXT", name = "upload_id")
    private String uploadIdsJson; // Multiple document files

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Transient
    private Map<String, Boolean> isFileAvailable;
}
