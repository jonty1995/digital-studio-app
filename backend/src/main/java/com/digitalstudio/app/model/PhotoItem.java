package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;

@Entity
@Data
@Table(name = "photo_items")
public class PhotoItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String name;

    // Legacy price columns removed from DB - removing from Entity to prevent
    // recreation/errors

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "pricing_configurations", columnDefinition = "TEXT")
    private String pricingConfigurations; // Stores JSON array of pricing rules for this item

    @Transient
    private String originalName; // Used for tracking renames during updates

    @Column(name = "regular_base_price")
    private Double regularBasePrice;

    @Column(name = "regular_customer_price")
    private Double regularCustomerPrice;

    @Column(name = "instant_base_price")
    private Double instantBasePrice;

    @Column(name = "instant_customer_price")
    private Double instantCustomerPrice;
}
