package com.digitalstudio.app.dto;

import com.digitalstudio.app.model.Addon;
import com.digitalstudio.app.model.PhotoItem;
import com.digitalstudio.app.model.ServiceItem;
import com.digitalstudio.app.model.ValueConfiguration;
import lombok.Data;
import java.util.List;

@Data
public class ConfigExportDTO {
    private List<PhotoItem> photoItems;
    private List<Addon> addons;
    private List<ServiceItem> services;
    private List<AddonPricingRule> pricingRules;
    private List<ValueConfiguration> values;
}
