package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.Addon;
import com.digitalstudio.app.dto.AddonPricingRule;
import com.digitalstudio.app.model.PhotoItem;
import com.digitalstudio.app.model.ServiceItem;
import com.digitalstudio.app.service.ConfigurationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

import com.digitalstudio.app.dto.ConfigExportDTO;
import com.digitalstudio.app.model.ValueConfiguration;

@RestController
@RequestMapping("/api/config")
@CrossOrigin(origins = "*") // Allow frontend access
public class ConfigurationController {

    @Autowired
    private ConfigurationService configurationService;

    // Items
    @GetMapping("/items")
    public List<PhotoItem> getPhotoItems() {
        return configurationService.getAllPhotoItems();
    }

    @PostMapping("/items")
    public List<PhotoItem> savePhotoItems(@RequestBody List<PhotoItem> items) {
        return configurationService.savePhotoItems(items);
    }

    // Addons
    @GetMapping("/addons")
    public List<Addon> getAddons() {
        return configurationService.getAllAddons();
    }

    @PostMapping("/addons")
    public List<Addon> saveAddons(@RequestBody List<Addon> addons) {
        return configurationService.saveAddons(addons);
    }

    // Services
    @GetMapping("/services")
    public List<ServiceItem> getServiceItems() {
        return configurationService.getAllServiceItems();
    }

    @PostMapping("/services")
    public List<ServiceItem> saveServiceItems(@RequestBody List<ServiceItem> items) {
        return configurationService.saveServiceItems(items);
    }

    // Pricing
    @GetMapping("/pricing-rules")
    public List<AddonPricingRule> getPricingRules() {
        return configurationService.getAllPricingRules();
    }

    @PostMapping("/pricing-rules")
    public List<AddonPricingRule> savePricingRules(@RequestBody List<AddonPricingRule> rules) {
        configurationService.savePricingRules(rules);
        return configurationService.getAllPricingRules();
    }

    // Value Configurations
    @GetMapping("/values")
    public List<ValueConfiguration> getValues() {
        return configurationService.getAllValues();
    }

    @PostMapping("/values")
    public List<ValueConfiguration> saveValues(@RequestBody List<ValueConfiguration> values) {
        return configurationService.saveValues(values);
    }

    // Full Config Export/Import
    @GetMapping("/full")
    public ConfigExportDTO getFullConfig() {
        return configurationService.exportAll();
    }

    @PostMapping("/full")
    public ResponseEntity<?> importFullConfig(@RequestBody ConfigExportDTO dto) {
        try {
            configurationService.importAll(dto);
            return ResponseEntity.ok(Collections.singletonMap("message", "Configuration Imported Successfully"));
        } catch (Exception e) {
            System.err.println("Error importing configuration: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest()
                    .body(Collections.singletonMap("error", "Import Failed: " + e.getMessage()));
        }
    }
}
