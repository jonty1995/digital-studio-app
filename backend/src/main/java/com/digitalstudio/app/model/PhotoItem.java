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

    @Column(name = "regular_base_price")
    private Integer regularBasePrice;

    @Column(name = "regular_customer_price")
    private Integer regularCustomerPrice;

    @Column(name = "instant_base_price")
    private Integer instantBasePrice;

    @Column(name = "instant_customer_price")
    private Integer instantCustomerPrice;
}
