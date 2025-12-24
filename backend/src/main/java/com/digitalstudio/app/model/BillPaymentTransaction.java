package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "bill_transactions")
public class BillPaymentTransaction {
    @Id
    private Long orderId; // Timestamp based

    private Long customerId;
    private String billType; // Mobile/DTH/Electricity
    private String billId;
    private String billCustomerName;
    private String operator;
    private Long paymentId;
    private String transactionStatus;
    private Long uploadId; // Optional receipt

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
