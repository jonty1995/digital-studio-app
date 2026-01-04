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


    
    // Legacy price columns removed from DB - removing from Entity to prevent recreation/errors
    
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "addon_combinations", columnDefinition = "TEXT")
    private String addonCombinations; // Stores JSON array of pricing rules for this item

    @Column(name = "regular_base_price")
    private Double regularBasePrice;
    
    @Column(name = "regular_customer_price")
    private Double regularCustomerPrice;
    
    @Column(name = "instant_base_price")
    private Double instantBasePrice;
    
    @Column(name = "instant_customer_price")
    private Double instantCustomerPrice;
}
