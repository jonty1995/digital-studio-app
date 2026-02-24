package com.digitalstudio.app.dto;

import com.digitalstudio.app.model.Addon;
import com.digitalstudio.app.model.PhotoItem;
import com.digitalstudio.app.model.ServiceItem;
import com.digitalstudio.app.model.ValueConfiguration;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;
import java.util.List;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ConfigExportDTO {
    private List<PhotoItem> photoItems;
    private List<Addon> addons;
    private List<ServiceItem> services;
    private List<ValueConfiguration> values;
}
