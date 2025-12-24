package com.digitalstudio.app.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Entity
@Data
@Table(name = "addon_pricing_rules")
public class AddonPricingRule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String item; // Photo Item Name

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "pricing_rule_addons", joinColumns = @JoinColumn(name = "rule_id"))
    @Column(name = "addon_name")
    private List<String> addons; // List of Addon Names

    private Integer basePrice;
    private Integer customerPrice;
}
