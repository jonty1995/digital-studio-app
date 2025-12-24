package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "customers")
public class Customer {
    @Id
    private Long customerId; // Manually assigned (Mobile or Generated)

    private String name;

    @Column(columnDefinition = "TEXT")
    private String editHistoryJson;
}
