package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "bill_payment_transactions")
public class BillPaymentTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private BillTransactionType transactionType;

    @ManyToOne
    @JoinColumn(name = "customer_id")
    private Customer customer;

    private String operator; // For Mobile/DTH
    private String billId; // Consumer No, Mobile No, Subscriber ID (Renamed from referenceId)
    private String billCustomerName; // For Electricity

    @OneToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    private String status; // Pending, Completed, etc.

    @Column(columnDefinition = "TEXT")
    private String statusHistoryJson;

    private String uploadId; // For receipt/bill image

    @CreationTimestamp
    private LocalDateTime createdAt;
}
