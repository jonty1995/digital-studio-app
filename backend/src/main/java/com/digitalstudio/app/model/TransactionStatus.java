package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "transaction_status")
public class TransactionStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long nextStatusId;
    private String name;
    private String statusType; // Pending, Success, Failure, Refund
    private String color;
}
