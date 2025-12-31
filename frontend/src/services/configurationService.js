import { api } from "./api";

const ENDPOINTS = {
    ITEMS: '/config/items',
    ADDONS: '/config/addons',
    PRICING: '/config/pricing-rules'
};

export const configurationService = {
    getItems: async () => {
        try {
            const response = await api.get(ENDPOINTS.ITEMS);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            console.error("Failed to fetch photo items", error);
            return [];
        }
    },
    saveItems: async (items) => {
        const cleanItems = items.map(i => ({ ...i, id: null }));
        try {
            await api.post(ENDPOINTS.ITEMS, cleanItems);
        } catch (error) {
            console.error("Failed to save items", error);
        }
    },

    getAddons: async () => {
        try {
            const response = await api.get(ENDPOINTS.ADDONS);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            console.error("Failed to fetch addons", error);
            return [];
        }
    },
    saveAddons: async (addons) => {
        const cleanAddons = addons.map(a => ({ ...a, id: null }));
        try {
            await api.post(ENDPOINTS.ADDONS, cleanAddons);
        } catch (error) {
            console.error("Failed to save addons", error);
        }
    },

    getPricingRules: async () => {
        try {
            const response = await api.get(ENDPOINTS.PRICING);
            return Array.isArray(response) ? response : [];
        } catch (error) {
            console.error("Failed to fetch pricing rules", error);
            return [];
        }
    },
    savePricingRules: async (rules) => {
        return await api.post("/config/pricing-rules", rules);
    },
    exportFull: async () => {
        return await api.get("/config/full");
    },
    importFull: async (data) => {
        return await api.post("/config/full", data);
    },

    // Helper to calculate price (Synchronous helper relying on loaded data? No, data is async now.)
    // We need to fetch data or assume components pass it in. 
    // The previous implementation of calculatePrice was synchronous and fetched from localStorage (sync). 
    // Now getItems is async. 
    // Refactoring calculatePrice: It should accept the configuration Arrays as arguments 
    // OR we cache them.
    // The Update to PhotoItemForm passed "availableItems" etc. 
    // But calculatePrice was called independently.
    // I should change calculatePrice to accept the rules/items to avoid async complexity in calculation logic,
    // OR make it async.
    // Given usage in render loops or event handlers, keeping it synchronous with passed-in data is better.

    // BUT checking usage in PhotoItemForm: 
    // `const unitPrice = configurationService.calculatePrice(...)` matches current usage. 
    // I need to update PhotoItemForm to pass the context data/rules to it, 
    // OR simpler: `configurationService` maintains a local cache of the last fetched data?
    // Let's implement calculatePrice to take `items` and `rules` as arguments.
    // It's a pure function then.

    calculatePrice: (itemName, addonNames, isInstant, isCustomer, items, rules) => {
        if (!items || !rules || !itemName) return 0;

        const item = items.find(i => i.name === itemName);
        if (!item) return 0;

        // Determine Base Price for the Item itself based on mode
        const itemBasePrice = isCustomer
            ? (isInstant ? (parseFloat(item.instantCustomerPrice) || 0) : (parseFloat(item.regularCustomerPrice) || 0))
            : (isInstant ? (parseFloat(item.instantBasePrice) || 0) : (parseFloat(item.regularBasePrice) || 0));

        if (!addonNames || addonNames.length === 0) {
            return itemBasePrice;
        }

        // 1. Try to find EXACT rule match for this specific combination
        const sortedAddons = [...addonNames].sort().join(",");
        const exactRule = rules.find(r =>
            r.item === itemName &&
            (r.addons || []).sort().join(",") === sortedAddons
        );

        if (exactRule) {
            return isCustomer
                ? (parseFloat(exactRule.customerPrice) || 0)
                : (parseFloat(exactRule.basePrice) || 0);
        }

        // 2. Additive Fallback: Sum up individual addon costs
        // We assume the "cost" of an addon is (RulePrice - ItemRegularPrice).
        // We calculate this margin and add it to the current itemBasePrice (which handles Instant vs Regular).

        // Base reference for calculating addon margin (Regular price is standard reference)
        const referenceBase = isCustomer
            ? (parseFloat(item.regularCustomerPrice) || 0)
            : (parseFloat(item.regularBasePrice) || 0);

        let totalAddonsCost = 0;

        for (const addon of addonNames) {
            const addonRule = rules.find(r =>
                r.item === itemName &&
                r.addons && r.addons.length === 1 && r.addons[0] === addon
            );

            if (addonRule) {
                const rulePrice = isCustomer
                    ? (parseFloat(addonRule.customerPrice) || 0)
                    : (parseFloat(addonRule.basePrice) || 0);

                // Margin = Price of (Item+Addon) - Price of (Item Only)
                // If referenceBase is 0, we just take the rule price (implied full cost).
                const margin = rulePrice - referenceBase;
                totalAddonsCost += margin;
            }
        }

        return itemBasePrice + totalAddonsCost;
    }
};
