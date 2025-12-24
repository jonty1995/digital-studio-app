package com.digitalstudio.app.controller;

import com.digitalstudio.app.model.Addon;
import com.digitalstudio.app.model.AddonPricingRule;
import com.digitalstudio.app.model.PhotoItem;
import com.digitalstudio.app.service.ConfigurationService;
import org.springframework.beans.factory.annotation.Autowired;
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
        // Clean IDs for new items if they look like timestamps (optional, but JPA might treat non-null ID as detached entity)
        // Actually, if ID is provided and not in DB, merge() might fail or try to insert with that ID depending on dialect/strategy.
        // IDENTITY strategy usually ignores ID on insert, but Hibernate checks versioning.
        // Let's rely on "replaceAll" logic for simplicity which wipes and recreates.
        // But wiping deletes IDs. 
        // Ideally, we persist IDs.
        // If frontend sends an ID that IS valid from DB, we keep it. 
        // If it sends a timestamp ID, we might want to reset it to null to force new ID generation.
        // But if we delete all, all IDs become invalid anyway. 
        // The "deleteAll + saveAll" approach is brutal but effective for mirroring "localStorage". 
        // It does mean IDs reset on every save, which is bad if Order History references these IDs.
        // BUT currently Orders reference NAMES (string). So changing IDs is safe!
        configurationService.replaceAllPhotoItems(items);
        return configurationService.getAllPhotoItems();
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
}
