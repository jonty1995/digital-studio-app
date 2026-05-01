package com.digitalstudio.app.model;

import com.digitalstudio.app.dto.AddonPricingRule;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Entity
@Data
@Table(name = "photo_items")
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PhotoItem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String name;

    // Legacy price columns removed from DB - removing from Entity to prevent
    // recreation/errors

    @JsonIgnore
    @Column(name = "pricing_configurations", columnDefinition = "TEXT")
    private String pricingConfigurations; // Stores JSON array of pricing rules for this item

    @Transient
    @JsonProperty("pricingRules")
    private List<AddonPricingRule> pricingRules;

    @Column(name = "regular_base_price")
    private Double regularBasePrice;

    @Column(name = "regular_customer_price")
    private Double regularCustomerPrice;

    @Column(name = "instant_base_price")
    private Double instantBasePrice;

    @Column(name = "instant_customer_price")
    private Double instantCustomerPrice;

    @Column(name = "has_regular")
    private Boolean hasRegular = true;

    @Column(name = "has_instant")
    private Boolean hasInstant = true;
}
