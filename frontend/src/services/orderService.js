import { api } from "./api";

export const orderService = {
    createOrder: async (orderData) => {
        // orderData matches PhotoOrderRequest DTO: { customer, items, description, payment, image }
        return await api.post("/orders", orderData);
    },

    getAllOrders: async (filters = {}, page = 0, size = 20) => {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("size", size);

        Object.keys(filters).forEach(key => {
            if (filters[key] !== null && filters[key] !== "" && filters[key] !== undefined) {
                params.append(key, filters[key]);
            }
        });

        return await api.get(`/orders?${params.toString()}`);
    },

    updateBulkStatus: async (ids, status) => {
        return await api.put("/orders/bulk-status", { ids, status });
    }
};
