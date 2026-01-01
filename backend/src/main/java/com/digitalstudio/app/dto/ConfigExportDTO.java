package com.digitalstudio.app.dto;

import com.digitalstudio.app.model.Addon;
import com.digitalstudio.app.model.AddonPricingRule;
import com.digitalstudio.app.model.PhotoItem;
import lombok.Data;

import java.util.List;

@Data
public class ConfigExportDTO {
    private List<PhotoItem> photoItems;
    private List<Addon> addons;
    private List<AddonPricingRule> pricingRules;
    private List<com.digitalstudio.app.model.ValueConfiguration> values;
}
