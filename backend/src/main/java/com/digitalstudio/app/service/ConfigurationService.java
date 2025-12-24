package com.digitalstudio.app.service;

import com.digitalstudio.app.model.Addon;
import com.digitalstudio.app.model.AddonPricingRule;
import com.digitalstudio.app.model.PhotoItem;
import com.digitalstudio.app.repository.AddonPricingRuleRepository;
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

    @Autowired
    private AddonPricingRuleRepository pricingRuleRepository;

    // Photo Items
    public List<PhotoItem> getAllPhotoItems() {
        return photoItemRepository.findAll();
    }

    public List<PhotoItem> savePhotoItems(List<PhotoItem> items) {
        // Simple replace all strategy or intelligent merge?
        // Frontend sends "all items". The repository.saveAll works.
        // But if IDs are missing, it inserts. If present, updates.
        // If user deleted on frontend, strictly speaking we should delete from DB.
        // For simplicity: Replace all logic: delete all and save all? 
        // Or trust frontend to manage IDs.
        // Frontend generates `Date.now()` derived IDs which are huge numbers. Database usually wants GeneratedValue.
        // If I use `Date.now()` as ID, that might conflict or be weird if I use @GeneratedValue(IDENTITY).
        // I should stick to DB generated IDs.
        // Frontend logic uses `Date.now()` locally. When saving to backend, if I send ID, it assumes it exists.
        // But `Date.now()` ID definitely doesn't exist in DB initially.
        // So backend should handle: if ID is large/timestamp-like, treat as null/new? 
        // Or better: Use @GeneratedValue. Frontend should send null ID for new items.
        // But frontend assigns ID to track it in UI.
        // Strategy: 
        // 1. Delete all and rewrite? Safe but IDs change.
        // 2. Ideally, frontend should separate "temp ID" from "db ID".
        // Let's implement safeSave: 
        // Allow saving list. 
        return photoItemRepository.saveAll(items);
    }
    
    // Addons
    public List<Addon> getAllAddons() {
        return addonRepository.findAll();
    }

    public List<Addon> saveAddons(List<Addon> addons) {
        return addonRepository.saveAll(addons);
    }

    // Pricing Rules
    public List<AddonPricingRule> getAllPricingRules() {
        return pricingRuleRepository.findAll();
    }
    
    public List<AddonPricingRule> savePricingRules(List<AddonPricingRule> rules) {
        return pricingRuleRepository.saveAll(rules);
    }
    
    // Deletion Helpers (if needed individually, or we rely on saveAll/deleteAll from frontend logic)
    // Actually frontend logic in service currently does "saveItems(items)" which implies a full state push.
    // If I just saveAll, the deleted ones in frontend won't be deleted in DB!
    // I need "sync" logic or explicit delete endpoints.
    // Since previous frontend logic was localStorage (full replace), I should support "Replace All" for simplest migration.
    
    public void replaceAllPhotoItems(List<PhotoItem> items) {
        photoItemRepository.deleteAll();
        photoItemRepository.saveAll(items);
    }

    public void replaceAllAddons(List<Addon> addons) {
        addonRepository.deleteAll();
        addonRepository.saveAll(addons);
    }

    public void replaceAllPricingRules(List<AddonPricingRule> rules) {
        pricingRuleRepository.deleteAll();
        pricingRuleRepository.saveAll(rules);
    }
}
