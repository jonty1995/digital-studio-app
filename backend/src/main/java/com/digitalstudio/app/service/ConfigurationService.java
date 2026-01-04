package com.digitalstudio.app.service;

import com.digitalstudio.app.model.Addon;
import com.digitalstudio.app.model.AddonPricingRule;
import com.digitalstudio.app.model.PhotoItem;

import com.digitalstudio.app.repository.AddonRepository;
import com.digitalstudio.app.repository.PhotoItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ConfigurationService {

    @Autowired
    private PhotoItemRepository photoItemRepository;

    @Autowired
    private AddonRepository addonRepository;



    // Photo Items
    public List<PhotoItem> getAllPhotoItems() {
        return photoItemRepository.findAll();
    }

    public List<PhotoItem> savePhotoItems(List<PhotoItem> items) {
        // Preserve addonCombinations by matching Item Name
        List<PhotoItem> existingItems = photoItemRepository.findAll();
        java.util.Map<String, String> addonsMap = existingItems.stream()
            .filter(i -> i.getAddonCombinations() != null)
            .collect(java.util.stream.Collectors.toMap(PhotoItem::getName, PhotoItem::getAddonCombinations, (a, b) -> a));

        for (PhotoItem item : items) {
             // Restore addon combinations if existing
             if (addonsMap.containsKey(item.getName())) {
                 item.setAddonCombinations(addonsMap.get(item.getName()));
             }
             // Ensure prices are not null
             if (item.getRegularBasePrice() == null) item.setRegularBasePrice(0.0);
             if (item.getRegularCustomerPrice() == null) item.setRegularCustomerPrice(0.0);
             if (item.getInstantBasePrice() == null) item.setInstantBasePrice(0.0);
             if (item.getInstantCustomerPrice() == null) item.setInstantCustomerPrice(0.0);
        }
        
        // Replace all items with new list (which contains merged addon data)
        photoItemRepository.deleteAll();
        return photoItemRepository.saveAll(items);
    }
    
    // Addons
    public List<Addon> getAllAddons() {
        return addonRepository.findAll();
    }

    public List<Addon> saveAddons(List<Addon> addons) {
        return addonRepository.saveAll(addons);
    }

    // Pricing Rules - REFACTORED to use PhotoItem.addonCombinations
    // We no longer natively use pricingRuleRepository for source of truth.
    // However, we reuse the AddonPricingRule class as a DTO to maintain API compatibility.
    
    private final com.fasterxml.jackson.databind.ObjectMapper jsonMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    public List<AddonPricingRule> getAllPricingRules() {
        List<AddonPricingRule> allRules = new java.util.ArrayList<>();
        List<PhotoItem> items = photoItemRepository.findAll();
        
        for (PhotoItem item : items) {
            String json = item.getAddonCombinations();
            if (json != null && !json.isEmpty()) {
                try {
                    List<java.util.Map<String, Object>> ruleMaps = jsonMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<List<java.util.Map<String, Object>>>(){});
                    for (java.util.Map<String, Object> map : ruleMaps) {
                        AddonPricingRule rule = new AddonPricingRule();
                        rule.setItem(item.getName());
                        // Handle potential integer/double conversion issues from JSON
                        rule.setBasePrice(map.get("basePrice") != null ? Double.parseDouble(map.get("basePrice").toString()) : 0.0);
                        rule.setCustomerPrice(map.get("customerPrice") != null ? Double.parseDouble(map.get("customerPrice").toString()) : 0.0);
                        rule.setAddons((List<String>) map.get("addons"));
                        
                        // Generate deterministic synthetic ID based on content
                        String idSource = item.getName() + "_" + (rule.getAddons() != null ? rule.getAddons().stream().sorted().collect(java.util.stream.Collectors.joining(",")) : "");
                        rule.setId((long) Math.abs(idSource.hashCode()));
                        
                        allRules.add(rule);
                    }
                } catch (Exception e) {
                    System.err.println("Failed to parse addonCombinations for " + item.getName() + ": " + e.getMessage());
                }
            }
        }
        return allRules;
    }
    
    public List<AddonPricingRule> savePricingRules(List<AddonPricingRule> rules) {
        // Group rules by Item Name
        java.util.Map<String, List<AddonPricingRule>> rulesByItem = rules.stream()
            .collect(java.util.stream.Collectors.groupingBy(AddonPricingRule::getItem));
            
        List<PhotoItem> items = photoItemRepository.findAll();
        
        for (PhotoItem item : items) {
            // Find rules for this item
            List<AddonPricingRule> itemRules = rulesByItem.get(item.getName());
            
            if (itemRules != null && !itemRules.isEmpty()) {
                // Serialize to JSON, strictly enforcing NON-EMPTY addons
                try {
                     List<java.util.Map<String, Object>> ruleDtos = itemRules.stream()
                        .filter(r -> r.getAddons() != null && !r.getAddons().isEmpty())
                        .map(r -> {
                            java.util.Map<String, Object> dto = new java.util.HashMap<>();
                            dto.put("addons", r.getAddons());
                            dto.put("basePrice", r.getBasePrice());
                            dto.put("customerPrice", r.getCustomerPrice());
                            return dto;
                        }).collect(java.util.stream.Collectors.toList());
                    
                    if (!ruleDtos.isEmpty()) {
                        String json = jsonMapper.writeValueAsString(ruleDtos);
                        item.setAddonCombinations(json);
                    } else {
                        item.setAddonCombinations(null);
                    }
                } catch (Exception e) {
                     System.err.println("Failed to serialize rules for " + item.getName());
                }
            } else {
                // Determine logic: If no rules passed for this item, do we clear them?
                // Frontend usually sends "All" rules. If an item is missing from the list, it probably has no rules.
                // UNLESS it's a partial update. 
                // But `savePricingRules` (POST) typically replaced everything in old logic.
                // So YES, we should clear it if missing?
                // Or maybe the input excludes items with no rules.
                // Let's assume clear is safer to match "Replace All" behavior.
                item.setAddonCombinations(null); // Clear
            }
        }
        photoItemRepository.saveAll(items);
        
        // Return re-converted list to confirm save
        return getAllPricingRules();
    }
    
    // Deletion Helpers
    
    public void replaceAllPhotoItems(List<PhotoItem> items) {
        photoItemRepository.deleteAll();
        savePhotoItems(items); // Use logic
    }

    public void replaceAllAddons(List<Addon> addons) {
        addonRepository.deleteAll();
        addonRepository.saveAll(addons);
    }

    public void replaceAllPricingRules(List<AddonPricingRule> rules) {
        // Redirect to new save logic
        savePricingRules(rules);
    }
    // Full Config
    public com.digitalstudio.app.dto.ConfigExportDTO exportFullConfig() {
        com.digitalstudio.app.dto.ConfigExportDTO dto = new com.digitalstudio.app.dto.ConfigExportDTO();
        dto.setPhotoItems(photoItemRepository.findAll());
        dto.setAddons(addonRepository.findAll());
        dto.setPricingRules(getAllPricingRules()); // Use getter
        dto.setValues(getAllValues());
        return dto;
    }

    public void importFullConfig(com.digitalstudio.app.dto.ConfigExportDTO dto) {
        // Order matters? Addons should be loaded first maybe?
        if (dto.getAddons() != null) {
            addonRepository.deleteAllInBatch();
            dto.getAddons().forEach(addon -> addon.setId(null));
            addonRepository.saveAll(dto.getAddons());
        }
        
        // Items must be loaded before Pricing Rules because Rules attach to Items now!
        if (dto.getPhotoItems() != null) {
            photoItemRepository.deleteAllInBatch();
             dto.getPhotoItems().forEach(item -> item.setId(null));
            savePhotoItems(dto.getPhotoItems()); // Use logic
        }
        
        // Now apply Pricing Rules
        if (dto.getPricingRules() != null) {
            savePricingRules(dto.getPricingRules());
        }

        // Values
        if (dto.getValues() != null) {
            valueConfigurationRepository.deleteAllInBatch();
            valueConfigurationRepository.saveAll(dto.getValues());
        }
    }

    // Value Configurations
    @Autowired
    private com.digitalstudio.app.repository.ValueConfigurationRepository valueConfigurationRepository;

    public List<com.digitalstudio.app.model.ValueConfiguration> getAllValues() {
        return valueConfigurationRepository.findAll();
    }

    public List<com.digitalstudio.app.model.ValueConfiguration> saveValues(List<com.digitalstudio.app.model.ValueConfiguration> values) {
        // Full replace strategy for simple config management
        valueConfigurationRepository.deleteAll();
        return valueConfigurationRepository.saveAll(values);
    }

    public String getValue(String key) {
        return valueConfigurationRepository.findById(key)
                .map(com.digitalstudio.app.model.ValueConfiguration::getValue)
                .orElse(null);
    }
}
