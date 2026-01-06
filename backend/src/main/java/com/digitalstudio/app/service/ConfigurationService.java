package com.digitalstudio.app.service;

import com.digitalstudio.app.model.Addon;
import com.digitalstudio.app.model.AddonPricingRule;
import com.digitalstudio.app.model.PhotoItem;

import com.digitalstudio.app.repository.AddonRepository;
import com.digitalstudio.app.repository.PhotoItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.digitalstudio.app.dto.ConfigExportDTO;
import com.digitalstudio.app.model.AuditLog;
import com.digitalstudio.app.model.ValueConfiguration;
import com.digitalstudio.app.repository.AuditLogRepository;
import com.digitalstudio.app.repository.ValueConfigurationRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@Transactional
public class ConfigurationService {

    @Autowired
    private PhotoItemRepository photoItemRepository;

    @Autowired
    private AddonRepository addonRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private void logChange(String entityName, String entityId, String action, String fieldName, String oldValue,
            String newValue) {
        if (oldValue != null && oldValue.equals(newValue))
            return; // No change

        AuditLog log = new AuditLog();
        log.setEntityName(entityName);
        log.setEntityId(entityId);
        log.setAction(action);
        log.setFieldName(fieldName);
        log.setOldValue(oldValue);
        log.setNewValue(newValue);
        auditLogRepository.save(log);
    }

    // Photo Items
    public List<PhotoItem> getAllPhotoItems() {
        return photoItemRepository.findAll();
    }

    public List<PhotoItem> savePhotoItems(List<PhotoItem> newItems) {
        List<PhotoItem> existingItems = photoItemRepository.findAll();
        Map<Long, PhotoItem> existingMap = existingItems.stream()
                .collect(Collectors.toMap(PhotoItem::getId, i -> i));

        // Preserve pricing configs mapping by Name (for renames)
        Map<String, String> pricingMap = existingItems.stream()
                .filter(i -> i.getPricingConfigurations() != null)
                .collect(Collectors.toMap(PhotoItem::getName, PhotoItem::getPricingConfigurations, (a, b) -> a));

        List<PhotoItem> toSave = new ArrayList<>();

        for (PhotoItem newItem : newItems) {
            // Trust the incoming ID. Only generate if absolutely missing (legacy fallback)
            if (newItem.getId() == null) {
                if (newItem.getName() != null) {
                    newItem.setId((long) Math.abs(newItem.getName().hashCode()));
                } else {
                    newItem.setId(System.currentTimeMillis());
                }
            }

            // Restore Pricing Configs Logic
            String lookupName = (newItem.getOriginalName() != null && !newItem.getOriginalName().isEmpty())
                    ? newItem.getOriginalName()
                    : newItem.getName();
            if (pricingMap.containsKey(lookupName)) {
                newItem.setPricingConfigurations(pricingMap.get(lookupName));
            }

            // Defaults
            if (newItem.getRegularBasePrice() == null)
                newItem.setRegularBasePrice(0.0);
            if (newItem.getRegularCustomerPrice() == null)
                newItem.setRegularCustomerPrice(0.0);
            if (newItem.getInstantBasePrice() == null)
                newItem.setInstantBasePrice(0.0);
            if (newItem.getInstantCustomerPrice() == null)
                newItem.setInstantCustomerPrice(0.0);

            if (existingMap.containsKey(newItem.getId())) {
                PhotoItem oldItem = existingMap.get(newItem.getId());

                // Check Diffs
                if (!oldItem.getName().equals(newItem.getName())) {
                    logChange("PhotoItem", newItem.getName(), "UPDATE", "name", oldItem.getName(), newItem.getName());
                }
                if (!oldItem.getRegularBasePrice().equals(newItem.getRegularBasePrice())) {
                    logChange("PhotoItem", newItem.getName(), "UPDATE", "regularBasePrice",
                            String.valueOf(oldItem.getRegularBasePrice()),
                            String.valueOf(newItem.getRegularBasePrice()));
                }
                // ... simplify logging for other prices manually or via reflection if needed.
                // For now just explicit relevant fields.

                existingMap.remove(newItem.getId());
            } else {
                logChange("PhotoItem", newItem.getName(), "CREATE", null, null, newItem.getName());
            }
            toSave.add(newItem);
        }

        // Deletes
        for (PhotoItem deletedItem : existingMap.values()) {
            logChange("PhotoItem", deletedItem.getName(), "DELETE", null, deletedItem.getName(), null);
            photoItemRepository.delete(deletedItem);
        }

        return photoItemRepository.saveAll(toSave);
    }

    // Addons
    public List<Addon> getAllAddons() {
        return addonRepository.findAll();
    }

    public List<Addon> saveAddons(List<Addon> newAddons) {
        List<Addon> existingAddons = addonRepository.findAll();
        Map<Long, Addon> existingMap = existingAddons.stream()
                .collect(Collectors.toMap(Addon::getId, a -> a));

        List<Addon> toSave = new ArrayList<>();

        for (Addon newAddon : newAddons) {
            if (newAddon.getId() == null) {
                if (newAddon.getName() != null) {
                    newAddon.setId((long) Math.abs(newAddon.getName().hashCode()));
                } else {
                    newAddon.setId(System.currentTimeMillis());
                }
            }

            if (existingMap.containsKey(newAddon.getId())) {
                Addon oldAddon = existingMap.get(newAddon.getId());
                if (!oldAddon.getName().equals(newAddon.getName())) {
                    logChange("Addon", newAddon.getName(), "UPDATE", "name", oldAddon.getName(), newAddon.getName());
                }
                existingMap.remove(newAddon.getId());
            } else {
                logChange("Addon", newAddon.getName(), "CREATE", null, null, newAddon.getName());
            }
            toSave.add(newAddon);
        }

        for (Addon deleted : existingMap.values()) {
            logChange("Addon", deleted.getName(), "DELETE", null, deleted.getName(), null);
            addonRepository.delete(deleted);
        }
        return addonRepository.saveAll(toSave);
    }

    // Pricing Rules - REFACTORED to use PhotoItem.addonCombinations
    // We no longer natively use pricingRuleRepository for source of truth.
    // However, we reuse the AddonPricingRule class as a DTO to maintain API
    // compatibility.

    private final ObjectMapper jsonMapper = new ObjectMapper();

    public List<AddonPricingRule> getAllPricingRules() {
        List<AddonPricingRule> allRules = new ArrayList<>();
        List<PhotoItem> items = photoItemRepository.findAll();
        List<Addon> allAddons = addonRepository.findAll();
        Map<Long, String> idToNameMap = allAddons.stream().collect(Collectors.toMap(Addon::getId, Addon::getName));
        Map<String, Long> nameToIdMap = allAddons.stream()
                .collect(Collectors.toMap(Addon::getName, Addon::getId, (a, b) -> a));

        for (PhotoItem item : items) {
            String json = item.getPricingConfigurations();
            if (json != null && !json.isEmpty()) {
                try {
                    List<Map<String, Object>> ruleMaps = jsonMapper.readValue(json,
                            new TypeReference<List<Map<String, Object>>>() {
                            });
                    for (Map<String, Object> map : ruleMaps) {
                        AddonPricingRule rule = new AddonPricingRule();
                        rule.setItem(item.getName());
                        rule.setBasePrice(
                                map.get("basePrice") != null ? Double.parseDouble(map.get("basePrice").toString())
                                        : 0.0);
                        rule.setCustomerPrice(map.get("customerPrice") != null
                                ? Double.parseDouble(map.get("customerPrice").toString())
                                : 0.0);

                        Object addonsObj = map.get("addons");
                        List<String> ruleAddonNames = new ArrayList<>();
                        List<Long> ruleAddonIds = new ArrayList<>();

                        if (addonsObj instanceof List) {
                            List<?> list = (List<?>) addonsObj;
                            if (!list.isEmpty()) {
                                Object first = list.get(0);
                                if (first instanceof Number) {
                                    // Stored as IDs
                                    for (Object o : list) {
                                        Long id = ((Number) o).longValue();
                                        ruleAddonIds.add(id);
                                        if (idToNameMap.containsKey(id)) {
                                            ruleAddonNames.add(idToNameMap.get(id));
                                        } else {
                                            ruleAddonNames.add("Unknown ID: " + id);
                                        }
                                    }
                                } else {
                                    // Stored as Names (Legacy)
                                    for (Object o : list) {
                                        String name = o.toString();
                                        ruleAddonNames.add(name);
                                        if (nameToIdMap.containsKey(name)) {
                                            ruleAddonIds.add(nameToIdMap.get(name));
                                        }
                                    }
                                }
                            }
                        }
                        rule.setAddons(ruleAddonNames);
                        rule.setAddonIds(ruleAddonIds);

                        // ID generation for React key
                        String idSource = item.getName() + "_"
                                + ruleAddonIds.stream().sorted().map(String::valueOf).collect(Collectors.joining(","));
                        rule.setId((long) Math.abs(idSource.hashCode()));

                        allRules.add(rule);
                    }
                } catch (Exception e) {
                    System.err.println(
                            "Failed to parse pricingConfigurations for " + item.getName() + ": " + e.getMessage());
                }
            }
        }
        return allRules;
    }

    public List<AddonPricingRule> savePricingRules(List<AddonPricingRule> rules) {
        Map<String, List<AddonPricingRule>> rulesByItem = rules.stream()
                .collect(Collectors.groupingBy(AddonPricingRule::getItem));

        List<PhotoItem> items = photoItemRepository.findAll();

        for (PhotoItem item : items) {
            String oldJson = item.getPricingConfigurations();
            List<AddonPricingRule> itemRules = rulesByItem.get(item.getName());

            String newJson = null;
            if (itemRules != null && !itemRules.isEmpty()) {
                try {
                    List<Map<String, Object>> ruleDtos = itemRules.stream()
                            .filter(r -> (r.getAddonIds() != null && !r.getAddonIds().isEmpty())
                                    || (r.getAddons() != null && !r.getAddons().isEmpty()))
                            .map(r -> {
                                Map<String, Object> dto = new HashMap<>();
                                // PREFER IDs
                                if (r.getAddonIds() != null && !r.getAddonIds().isEmpty()) {
                                    dto.put("addons", r.getAddonIds());
                                } else {
                                    // Fallback to names? Users request to store IDs.
                                    // Ideally frontend sends IDs. If not present, we can try to look them up or
                                    // just save names (legacy).
                                    // Let's simplify: save whatever is available, preferably IDs.
                                    dto.put("addons", r.getAddons());
                                }
                                dto.put("basePrice", r.getBasePrice());
                                dto.put("customerPrice", r.getCustomerPrice());
                                return dto;
                            }).collect(Collectors.toList());

                    if (!ruleDtos.isEmpty()) {
                        newJson = jsonMapper.writeValueAsString(ruleDtos);
                    }
                } catch (Exception e) {
                }
            }

            if ((oldJson == null && newJson != null) || (oldJson != null && !oldJson.equals(newJson))) {
                logChange("PricingRule", item.getName(), "UPDATE", "rules", "old_config", "new_config");
                item.setPricingConfigurations(newJson);
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
    public ConfigExportDTO exportFullConfig() {
        ConfigExportDTO dto = new ConfigExportDTO();
        dto.setPhotoItems(photoItemRepository.findAll());
        dto.setAddons(addonRepository.findAll());
        dto.setPricingRules(getAllPricingRules()); // Use getter
        dto.setValues(getAllValues());
        return dto;
    }

    public void importFullConfig(ConfigExportDTO dto) {
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
    private ValueConfigurationRepository valueConfigurationRepository;

    public List<ValueConfiguration> getAllValues() {
        return valueConfigurationRepository.findAll();
    }

    public List<ValueConfiguration> saveValues(List<ValueConfiguration> newValues) {
        List<ValueConfiguration> existingValues = valueConfigurationRepository.findAll();
        Map<String, ValueConfiguration> existingMap = existingValues.stream()
                .collect(Collectors.toMap(ValueConfiguration::getName, v -> v));

        List<ValueConfiguration> toSave = new ArrayList<>();

        for (ValueConfiguration newVal : newValues) {
            if (existingMap.containsKey(newVal.getName())) {
                ValueConfiguration oldVal = existingMap.get(newVal.getName());
                if (!oldVal.getValue().equals(newVal.getValue())) {
                    logChange("ValueConfiguration", newVal.getName(), "UPDATE", "value", oldVal.getValue(),
                            newVal.getValue());
                }
                existingMap.remove(newVal.getName());
            } else {
                logChange("ValueConfiguration", newVal.getName(), "CREATE", null, null, newVal.getValue());
            }
            toSave.add(newVal);
        }

        for (ValueConfiguration deleted : existingMap.values()) {
            logChange("ValueConfiguration", deleted.getName(), "DELETE", null, deleted.getValue(), null);
            valueConfigurationRepository.delete(deleted);
        }
        return valueConfigurationRepository.saveAll(toSave);
    }

    public String getValue(String key) {
        return valueConfigurationRepository.findById(key)
                .map(ValueConfiguration::getValue)
                .orElse(null);
    }
}
