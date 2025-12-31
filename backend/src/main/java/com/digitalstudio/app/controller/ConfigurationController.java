package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.Addon;
import com.digitalstudio.app.model.AddonPricingRule;
import com.digitalstudio.app.model.PhotoItem;
import com.digitalstudio.app.service.ConfigurationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
        try {
            configurationService.replaceAllPhotoItems(items);
            return configurationService.getAllPhotoItems();
        } catch (Exception e) {
            System.err.println("Error saving photo items: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    // Addons
    @GetMapping("/addons")
    public List<Addon> getAddons() {
        return configurationService.getAllAddons();
    }

    @PostMapping("/addons")
    public List<Addon> saveAddons(@RequestBody List<Addon> addons) {
        configurationService.replaceAllAddons(addons);
        return configurationService.getAllAddons();
    }

    // Pricing
    @GetMapping("/pricing-rules")
    public List<AddonPricingRule> getPricingRules() {
        return configurationService.getAllPricingRules();
    }

    @PostMapping("/pricing-rules")
    public List<AddonPricingRule> savePricingRules(@RequestBody List<AddonPricingRule> rules) {
        configurationService.replaceAllPricingRules(rules);
        return configurationService.getAllPricingRules();
    }

    // Value Configurations
    @GetMapping("/values")
    public List<com.digitalstudio.app.model.ValueConfiguration> getValues() {
        return configurationService.getAllValues();
    }

    @PostMapping("/values")
    public List<com.digitalstudio.app.model.ValueConfiguration> saveValues(@RequestBody List<com.digitalstudio.app.model.ValueConfiguration> values) {
        return configurationService.saveValues(values);
    }

    // Full Config Export/Import
    @GetMapping("/full")
    public com.digitalstudio.app.dto.ConfigExportDTO getFullConfig() {
        return configurationService.exportFullConfig();
    }

    @PostMapping("/full")
    public ResponseEntity<?> importFullConfig(@RequestBody com.digitalstudio.app.dto.ConfigExportDTO dto) {
        try {
            configurationService.importFullConfig(dto);
            return ResponseEntity.ok(java.util.Collections.singletonMap("message", "Configuration Imported Successfully"));
        } catch (Exception e) {
            System.err.println("Error importing configuration: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(java.util.Collections.singletonMap("error", "Import Failed: " + e.getMessage()));
        }
    }
}
