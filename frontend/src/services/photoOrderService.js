const API_BASE_URL = import.meta.env.VITE_API_DIR || "/api";

export const photoOrderService = {
    // Create new order
    create: async (orderData) => {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData),
        });
        if (!response.ok) throw new Error("Failed to create order");
        return response.json();
    },

    // Update existing order
    update: async (id, orderData) => {
        const response = await fetch(`${API_BASE_URL}/orders/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(orderData),
        });
        if (!response.ok) throw new Error("Failed to update order");
        return response.json();
    },

    // Fetch all orders
    getAll: async (params) => {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${API_BASE_URL}/orders?${query}`);
        if (!response.ok) throw new Error("Failed to fetch orders");
        return response.json();
    },

    // Update status
    updateStatus: async (id, status) => {
        const response = await fetch(`${API_BASE_URL}/orders/${id}/status?status=${status}`, {
            method: "PUT",
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || "Failed to update status");
        }
        return response.json();
    },

    // Bulk update status
    bulkUpdateStatus: async (ids, status) => {
        const response = await fetch(`${API_BASE_URL}/orders/bulk/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids, status }),
        });
        if (!response.ok) throw new Error("Failed to bulk update status");
        return response.json();
    },

    // Get Recent Files Suggestions
    getSuggestions: async (mobile) => {
        const response = await fetch(`${API_BASE_URL}/orders/suggestions?mobile=${mobile}`);
        if (!response.ok) throw new Error("Failed to fetch suggestions");
        return response.json();
    }
};
