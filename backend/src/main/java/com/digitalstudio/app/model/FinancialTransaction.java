package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Data
@Table(name = "financial_transactions")
public class FinancialTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @CreationTimestamp
    private LocalDateTime timestamp;

    private String type; // CREDIT, DEBIT
    private String category; // ORDER, BILL_PAYMENT, SERVICE_ORDER, LAB_PAYMENT, SUPPLY, MANUAL,
                             // CARD_REPAYMENT
    private Double amount;
    private Double profit;
    private String paymentMode; // CASH, BANK, UPI, CREDIT_CARD
    private String description;

    private String relatedId; // ID of Order/Bill/etc.

    private UUID accountId; // Linked FinancialAccount
}
