package com.digitalstudio.app.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AddonPricingRule {
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String photoItemName;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private UUID photoItemId;

    private List<UUID> addonIds;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private List<String> addonNames;

    private Double regularBasePrice;
    private Double regularCustomerPrice;
    private Double instantBasePrice;
    private Double instantCustomerPrice;
}
