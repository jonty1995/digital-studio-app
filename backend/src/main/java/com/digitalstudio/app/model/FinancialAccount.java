package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Data
@Table(name = "financial_accounts")
public class FinancialAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountType accountType;
    
    // Primarily for CREDIT_CARD
    private Integer billingDate; // 1 to 31
    private Double totalLimit;
    private java.time.LocalDateTime lastRepaymentDate; // Used to calculate current unbilled
    
    private String color; // For UI differentiation
}
