import { api } from "./api";

export const photoOrderService = {
    // Create new order
    create: async (orderData) => {
        return await api.post("/orders", orderData);
    },

    // Update existing order
    update: async (id, orderData) => {
        return await api.put(`/orders/${id}`, orderData);
    },

    // Fetch all orders
    getAll: async (params) => {
        const query = new URLSearchParams(params).toString();
        return await api.get(`/orders?${query}`);
    },

    // Update status
    updateStatus: async (id, status) => {
        // Backend expects status as query param or part of DTO? 
        // Based on original code: `/orders/${id}/status?status=${status}`
        return await api.put(`/orders/${id}/status?status=${status}`);
    },

    // Bulk update status
    bulkUpdateStatus: async (ids, status) => {
        return await api.post("/orders/bulk/status", { ids, status });
    },

    // Get Recent Files Suggestions
    getSuggestions: async (mobile) => {
        return await api.get(`/orders/suggestions?mobile=${mobile}`);
    }
};
