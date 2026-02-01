package com.digitalstudio.app.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class AddonPricingRule {
    private String photoItemName;
    private UUID photoItemId;
    private List<UUID> addonIds;
    private List<String> addonNames;
    private Double regularBasePrice;
    private Double regularCustomerPrice;
    private Double instantBasePrice;
    private Double instantCustomerPrice;
}
