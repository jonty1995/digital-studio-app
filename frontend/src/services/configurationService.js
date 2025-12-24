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
        const cleanRules = rules.map(r => ({ ...r, id: null }));
        try {
            await api.post(ENDPOINTS.PRICING, cleanRules);
        } catch (error) {
            console.error("Failed to save pricing rules", error);
        }
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
        if (!items || !rules) return 0;

        const item = items.find(i => i.name === itemName);
        if (!item) return 0;

        // Check for rules
        const sortedAddons = [...addonNames].sort().join(",");
        const rule = rules.find(r =>
            r.item === itemName &&
            (r.addons || []).sort().join(",") === sortedAddons
        );

        if (rule) {
            return isCustomer ? rule.customerPrice : rule.basePrice;
        }

        // Fallback
        if (isCustomer) {
            return isInstant ? item.instantCustomer : item.regularCustomer;
        } else {
            return isInstant ? item.instantBase : item.regularBase;
        }
    }
};
