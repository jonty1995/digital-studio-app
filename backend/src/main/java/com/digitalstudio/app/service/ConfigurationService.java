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
            .filter(i -> i.getPricingConfigurations() != null)
            .collect(java.util.stream.Collectors.toMap(PhotoItem::getName, PhotoItem::getPricingConfigurations, (a, b) -> a));

        for (PhotoItem item : items) {
             // GENERATE DETERMINISTIC ID
             if (item.getName() != null) {
                 item.setId((long) Math.abs(item.getName().hashCode()));
             }
             
             // Restore pricing configs if existing
             String lookupName = (item.getOriginalName() != null && !item.getOriginalName().isEmpty()) ? item.getOriginalName() : item.getName();
             
             if (addonsMap.containsKey(lookupName)) {
                 item.setPricingConfigurations(addonsMap.get(lookupName));
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
        // GENERATE DETERMINISTIC ID
        addons.forEach(a -> {
            if (a.getName() != null) {
                a.setId((long) Math.abs(a.getName().hashCode()));
            }
        });
        addonRepository.deleteAll();
        return addonRepository.saveAll(addons);
    }

    // Pricing Rules - REFACTORED to use PhotoItem.addonCombinations
    // We no longer natively use pricingRuleRepository for source of truth.
    // However, we reuse the AddonPricingRule class as a DTO to maintain API compatibility.
    
    private final com.fasterxml.jackson.databind.ObjectMapper jsonMapper = new com.fasterxml.jackson.databind.ObjectMapper();

    public List<AddonPricingRule> getAllPricingRules() {
        List<AddonPricingRule> allRules = new java.util.ArrayList<>();
        List<PhotoItem> items = photoItemRepository.findAll();
        System.out.println("DEBUG: getAllPricingRules - found " + items.size() + " items");
        
        for (PhotoItem item : items) {
            String json = item.getPricingConfigurations();
            if (json != null && !json.isEmpty()) {
                System.out.println("DEBUG: Found JSON for " + item.getName() + ": " + json);
                try {
                    List<java.util.Map<String, Object>> ruleMaps = jsonMapper.readValue(json, new com.fasterxml.jackson.core.type.TypeReference<List<java.util.Map<String, Object>>>(){});
                    for (java.util.Map<String, Object> map : ruleMaps) {
                        AddonPricingRule rule = new AddonPricingRule();
                        rule.setItem(item.getName());
                        rule.setBasePrice(map.get("basePrice") != null ? Double.parseDouble(map.get("basePrice").toString()) : 0.0);
                        rule.setCustomerPrice(map.get("customerPrice") != null ? Double.parseDouble(map.get("customerPrice").toString()) : 0.0);
                        rule.setAddons((List<String>) map.get("addons"));
                        
                        String idSource = item.getName() + "_" + (rule.getAddons() != null ? rule.getAddons().stream().sorted().collect(java.util.stream.Collectors.joining(",")) : "");
                        rule.setId((long) Math.abs(idSource.hashCode()));
                        
                        allRules.add(rule);
                    }
                } catch (Exception e) {
                    System.err.println("Failed to parse pricingConfigurations for " + item.getName() + ": " + e.getMessage());
                }
            }
        }
        System.out.println("DEBUG: getAllPricingRules - returning " + allRules.size() + " rules");
        return allRules;
    }
    
    public List<AddonPricingRule> savePricingRules(List<AddonPricingRule> rules) {
        System.out.println("DEBUG: savePricingRules - received " + (rules != null ? rules.size() : "null") + " rules");
        
        java.util.Map<String, List<AddonPricingRule>> rulesByItem = rules.stream()
            .collect(java.util.stream.Collectors.groupingBy(AddonPricingRule::getItem));
            
        List<PhotoItem> items = photoItemRepository.findAll();
        
        for (PhotoItem item : items) {
            List<AddonPricingRule> itemRules = rulesByItem.get(item.getName());
            
            if (itemRules != null && !itemRules.isEmpty()) {
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
                        System.out.println("DEBUG: Saving JSON for " + item.getName() + ": " + json);
                        item.setPricingConfigurations(json);
                    } else {
                        System.out.println("DEBUG: No valid non-empty rules for " + item.getName());
                        item.setPricingConfigurations(null);
                    }
                } catch (Exception e) {
                     System.err.println("Failed to serialize rules for " + item.getName());
                }
            } else {
                System.out.println("DEBUG: No rules found in input for " + item.getName());
                // Only wipe if explicitly passed empty list? No, this is replace all logic.
                item.setPricingConfigurations(null);
            }
        }
        photoItemRepository.saveAll(items);
        return getAllPricingRules();
    }
    
    // Deletion Helpers
    
    public void replaceAllPhotoItems(List<PhotoItem> items) {
        photoItemRepository.deleteAll();
        savePhotoItems(items); // Use logic
    }

    public void replaceAllAddons(List<Addon> addons) {
        saveAddons(addons);
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
        // Order matters? Addons should be loaded first maybe?
        if (dto.getAddons() != null) {
            saveAddons(dto.getAddons());
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
