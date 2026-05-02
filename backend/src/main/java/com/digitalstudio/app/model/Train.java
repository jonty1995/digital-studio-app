package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trains", indexes = {
    @Index(name = "idx_train_number", columnList = "trainNumber"),
    @Index(name = "idx_train_name", columnList = "trainName")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Train {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String trainNumber;

    private String trainName;

    private String source;
    private String destination;
}
