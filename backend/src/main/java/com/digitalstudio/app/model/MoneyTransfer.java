package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

import java.util.UUID;

@Entity
@Data
@Table(name = "money_transfers")
public class MoneyTransfer {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String transferType; // UPI, ACCOUNT

    @ManyToOne
    @JoinColumn(name = "customer_id", columnDefinition = "BIGINT")
    private Customer customer;

    // UPI Fields
    private String upiId;
    private String mobileNumber;

    // Account Fields
    private String bankName;
    private String ifscCode;
    private String accountNumber;

    // Common Fields
    private String recipientName;
    private Double amount;

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    private String status; // Pending, Done, Failed, Discarded
    @Column(columnDefinition = "TEXT")
    private String statusHistoryJson;

    private String uploadId; // Receipt file

    @CreationTimestamp
    private LocalDateTime createdAt;

    @Transient
    private Boolean isFileAvailable;
}
