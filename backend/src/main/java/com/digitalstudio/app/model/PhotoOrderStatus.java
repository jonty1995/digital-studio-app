package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "photo_order_status")
public class PhotoOrderStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long nextStatusId;
    private String name;
    private Boolean isInstant;
    private Boolean isRegular;
    private String color;
}
