package com.digitalstudio.app.model;

import lombok.Data;
import java.util.List;

@Data
public class AddonPricingRule {
    private Long id;

    private String item; // Photo Item Name

    private List<String> addons; // List of Addon Names

    private Double basePrice;
    private Double customerPrice;
}
