package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "value_configurations")
public class ValueConfiguration {
    @Id
    @Column(unique = true)
    private String name;

    private String value;
}
