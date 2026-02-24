package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Data
@Table(name = "credit_cards")
public class CreditCard {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String name;
    private Integer billingDate; // 1 to 31
    private Double totalLimit;
    private String color; // For UI differentiation

    private java.time.LocalDateTime lastRepaymentDate; // Used to calculate current unbilled
}
