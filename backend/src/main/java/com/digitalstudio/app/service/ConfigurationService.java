package com.digitalstudio.app.service;

import com.digitalstudio.app.model.Addon;
import com.digitalstudio.app.dto.AddonPricingRule;
import com.digitalstudio.app.model.PhotoItem;
import com.digitalstudio.app.model.ServiceItem;

import com.digitalstudio.app.repository.AddonRepository;
import com.digitalstudio.app.repository.PhotoItemRepository;
import com.digitalstudio.app.repository.ServiceItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
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
    private ServiceItemRepository serviceItemRepository;

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
        Map<UUID, PhotoItem> existingMap = existingItems.stream()
                .collect(Collectors.toMap(PhotoItem::getId, i -> i));

        List<PhotoItem> toSave = new ArrayList<>();

        for (PhotoItem newItem : newItems) {
            // Defaults
            if (newItem.getRegularBasePrice() == null)
                newItem.setRegularBasePrice(0.0);
            if (newItem.getRegularCustomerPrice() == null)
                newItem.setRegularCustomerPrice(0.0);
            if (newItem.getInstantBasePrice() == null)
                newItem.setInstantBasePrice(0.0);
            if (newItem.getInstantCustomerPrice() == null)
                newItem.setInstantCustomerPrice(0.0);

            if (newItem.getRegularBasePrice() < 0 || newItem.getRegularCustomerPrice() < 0 ||
                    newItem.getInstantBasePrice() < 0 || newItem.getInstantCustomerPrice() < 0) {
                throw new IllegalArgumentException("Prices cannot be negative for photo item: " + newItem.getName());
            }

            if (newItem.getId() != null && existingMap.containsKey(newItem.getId())) {
                PhotoItem oldItem = existingMap.get(newItem.getId());

                // RESTORE Pricing: These are @JsonIgnore, so we must copy from DB
                newItem.setPricingConfigurations(oldItem.getPricingConfigurations());

                // Check Diffs for Audit
                if (!oldItem.getName().equals(newItem.getName())) {
                    logChange("PhotoItem", newItem.getName(), "UPDATE", "name", oldItem.getName(), newItem.getName());
                }
                if (!oldItem.getRegularBasePrice().equals(newItem.getRegularBasePrice())) {
                    logChange("PhotoItem", newItem.getName(), "UPDATE", "regularBasePrice",
                            String.valueOf(oldItem.getRegularBasePrice()),
                            String.valueOf(newItem.getRegularBasePrice()));
                }

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

    // Service Items
    public List<ServiceItem> getAllServiceItems() {
        return serviceItemRepository.findAll();
    }

    public List<ServiceItem> saveServiceItems(List<ServiceItem> newItems) {
        List<ServiceItem> existingItems = serviceItemRepository.findAll();
        Map<UUID, ServiceItem> existingMap = existingItems.stream()
                .collect(Collectors.<ServiceItem, UUID, ServiceItem>toMap(ServiceItem::getId, i -> i));

        List<ServiceItem> toSave = new ArrayList<>();

        for (ServiceItem newItem : newItems) {
            if (newItem.getBasePrice() != null && newItem.getBasePrice() < 0) {
                throw new IllegalArgumentException("Base price cannot be negative for service: " + newItem.getName());
            }
            if (newItem.getCustomerPrice() != null && newItem.getCustomerPrice() < 0) {
                throw new IllegalArgumentException(
                        "Customer price cannot be negative for service: " + newItem.getName());
            }
            if (newItem.getBasePrice() != null && newItem.getCustomerPrice() != null &&
                    newItem.getBasePrice() > newItem.getCustomerPrice()) {
                throw new IllegalArgumentException(
                        "Base price cannot be greater than customer price for service: " + newItem.getName());
            }

            // IDs are now auto-generated by JPA UUID strategy.

            if (newItem.getId() != null && existingMap.containsKey(newItem.getId())) {
                ServiceItem oldItem = existingMap.get(newItem.getId());
                if (!oldItem.getName().equals(newItem.getName())) {
                    logChange("ServiceItem", newItem.getName(), "UPDATE", "name", oldItem.getName(), newItem.getName());
                }
                if (!oldItem.getBasePrice().equals(newItem.getBasePrice())) {
                    logChange("ServiceItem", newItem.getName(), "UPDATE", "basePrice",
                            String.valueOf(oldItem.getBasePrice()), String.valueOf(newItem.getBasePrice()));
                }
                if (!oldItem.getCustomerPrice().equals(newItem.getCustomerPrice())) {
                    logChange("ServiceItem", newItem.getName(), "UPDATE", "customerPrice",
                            String.valueOf(oldItem.getCustomerPrice()), String.valueOf(newItem.getCustomerPrice()));
                }
                existingMap.remove(newItem.getId());
            } else {
                logChange("ServiceItem", newItem.getName(), "CREATE", null, null, newItem.getName());
            }
            toSave.add(newItem);
        }

        for (ServiceItem deleted : existingMap.values()) {
            logChange("ServiceItem", deleted.getName(), "DELETE", null, deleted.getName(), null);
            serviceItemRepository.delete(deleted);
        }

        return serviceItemRepository.saveAll(toSave);
    }

    // Addons
    public List<Addon> getAllAddons() {
        return addonRepository.findAll();
    }

    public List<Addon> saveAddons(List<Addon> newAddons) {
        List<Addon> existingAddons = addonRepository.findAll();
        Map<UUID, Addon> existingMap = existingAddons.stream()
                .collect(Collectors.toMap(Addon::getId, a -> a));

        List<Addon> toSave = new ArrayList<>();

        for (Addon newAddon : newAddons) {
            // IDs are now auto-generated by JPA UUID strategy.

            if (newAddon.getId() != null && existingMap.containsKey(newAddon.getId())) {
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

    // Pricing Rules - REFACTORED to use PhotoItem.pricingRules
    private final ObjectMapper jsonMapper = new ObjectMapper();

    private void populatePricingRules(PhotoItem item) {
        String json = item.getPricingConfigurations();
        if (json != null && !json.isEmpty()) {
            try {
                List<Map<String, Object>> ruleMaps = jsonMapper.readValue(json,
                        new TypeReference<List<Map<String, Object>>>() {
                        });
                List<AddonPricingRule> rules = new ArrayList<>();
                for (Map<String, Object> ruleMap : ruleMaps) {
                    AddonPricingRule rule = new AddonPricingRule();
                    rule.setPhotoItemId(item.getId());
                    rule.setPhotoItemName(item.getName());
                    rule.setAddonIds(extractUuids(ruleMap.get("addonIds")));
                    rule.setRegularBasePrice(toDouble(ruleMap.get("regularBasePrice")));
                    rule.setRegularCustomerPrice(toDouble(ruleMap.get("regularCustomerPrice")));
                    rule.setInstantBasePrice(toDouble(ruleMap.get("instantBasePrice")));
                    rule.setInstantCustomerPrice(toDouble(ruleMap.get("instantCustomerPrice")));
                    rules.add(rule);
                }
                item.setPricingRules(rules);
            } catch (Exception e) {
                System.err.println("Error parsing pricing config for " + item.getName());
            }
        }
    }

    private void serializePricingRules(PhotoItem item) {
        if (item.getPricingRules() == null)
            return;
        List<Map<String, Object>> ruleMaps = new ArrayList<>();
        for (AddonPricingRule rule : item.getPricingRules()) {
            Map<String, Object> map = new HashMap<>();
            map.put("addonIds", rule.getAddonIds());
            map.put("regularBasePrice", rule.getRegularBasePrice());
            map.put("regularCustomerPrice", rule.getRegularCustomerPrice());
            map.put("instantBasePrice", rule.getInstantBasePrice());
            map.put("instantCustomerPrice", rule.getInstantCustomerPrice());
            ruleMaps.add(map);
        }
        try {
            item.setPricingConfigurations(jsonMapper.writeValueAsString(ruleMaps));
        } catch (Exception e) {
            System.err.println("Error serializing pricing for " + item.getName());
        }
    }

    private List<UUID> extractUuids(Object obj) {
        List<UUID> uuids = new ArrayList<>();
        if (obj instanceof List) {
            for (Object item : (List<?>) obj) {
                if (item != null)
                    uuids.add(UUID.fromString(item.toString()));
            }
        }
        return uuids;
    }

    public List<AddonPricingRule> getAllPricingRules() {
        List<AddonPricingRule> allRules = new ArrayList<>();
        List<Addon> allAddons = addonRepository.findAll();
        Map<UUID, String> idToNameMap = allAddons.stream().collect(Collectors.toMap(Addon::getId, Addon::getName));

        for (PhotoItem item : photoItemRepository.findAll()) {
            populatePricingRules(item);
            if (item.getPricingRules() != null) {
                for (AddonPricingRule rule : item.getPricingRules()) {
                    // Enrich with addon names for UI
                    if (rule.getAddonIds() != null) {
                        List<String> names = rule.getAddonIds().stream()
                                .map(id -> idToNameMap.getOrDefault(id, id.toString()))
                                .collect(Collectors.toList());
                        rule.setAddonNames(names);
                    }
                    allRules.add(rule);
                }
            }
        }
        return allRules;
    }

    private Double toDouble(Object o) {
        if (o == null)
            return 0.0;
        if (o instanceof Number)
            return ((Number) o).doubleValue();
        try {
            return Double.parseDouble(o.toString());
        } catch (Exception e) {
            return 0.0;
        }
    }

    public void savePricingRules(List<AddonPricingRule> rules) {
        List<PhotoItem> allItems = photoItemRepository.findAll();
        Map<UUID, List<AddonPricingRule>> rulesById = rules.stream()
                .filter(r -> r.getPhotoItemId() != null)
                .collect(Collectors.groupingBy(AddonPricingRule::getPhotoItemId));

        Map<String, List<AddonPricingRule>> rulesByName = rules.stream()
                .filter(r -> r.getPhotoItemId() == null && r.getPhotoItemName() != null)
                .collect(Collectors.groupingBy(r -> r.getPhotoItemName().trim().toLowerCase()));

        for (PhotoItem item : allItems) {
            List<AddonPricingRule> itemRules = new ArrayList<>();
            if (rulesById.containsKey(item.getId())) {
                itemRules.addAll(rulesById.get(item.getId()));
            }
            String normalizedName = item.getName().trim().toLowerCase();
            if (rulesByName.containsKey(normalizedName)) {
                itemRules.addAll(rulesByName.get(normalizedName));
            }
            item.setPricingRules(itemRules);
            serializePricingRules(item);
        }
        photoItemRepository.saveAll(allItems);
    }

    @Autowired
    private ValueConfigurationRepository valueRepository;

    public List<ValueConfiguration> getAllValues() {
        return valueRepository.findAll();
    }

    public List<ValueConfiguration> saveValues(List<ValueConfiguration> values) {
        return valueRepository.saveAll(values);
    }

    public String getValue(String name) {
        return valueRepository.findById(name).map(ValueConfiguration::getValue).orElse(null);
    }

    public ConfigExportDTO exportAll() {
        ConfigExportDTO dto = new ConfigExportDTO();
        List<PhotoItem> items = getAllPhotoItems();
        items.forEach(this::populatePricingRules);
        dto.setPhotoItems(items);
        dto.setServices(getAllServiceItems());
        dto.setAddons(getAllAddons());
        dto.setValues(getAllValues());
        return dto;
    }

    public void importAll(ConfigExportDTO dto) {
        // 1. PRE-PROCESS & VALIDATE (Dry Run phase)
        // Ensure all PhotoItems can be serialized correctly before touching the DB
        if (dto.getPhotoItems() != null) {
            for (PhotoItem item : dto.getPhotoItems()) {
                // This triggers JSON serialization. If it fails, the whole method throws
                // exception
                // and nothing is deleted because of @Transactional
                serializePricingRules(item);
            }
        }

        // 2. EXECUTE (Atomic phase)
        // If we reached here, pre-processing succeeded.
        if (dto.getAddons() != null) {
            addonRepository.deleteAllInBatch();
            addonRepository.saveAll(dto.getAddons());
        }
        if (dto.getPhotoItems() != null) {
            photoItemRepository.deleteAllInBatch();
            photoItemRepository.saveAll(dto.getPhotoItems());
        }
        if (dto.getServices() != null) {
            serviceItemRepository.deleteAllInBatch();
            serviceItemRepository.saveAll(dto.getServices());
        }
        if (dto.getValues() != null) {
            valueRepository.deleteAllInBatch();
            valueRepository.saveAll(dto.getValues());
        }
    }
}
