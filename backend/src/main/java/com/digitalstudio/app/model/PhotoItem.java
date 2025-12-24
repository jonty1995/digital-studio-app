package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "photo_items")
public class PhotoItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private Integer regularBase;
    private Integer regularCustomer;
    private Integer instantBase;
    private Integer instantCustomer;
}
