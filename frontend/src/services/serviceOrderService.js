import { api } from "./api";

export const serviceOrderService = {
    getAll: async (params, signal) => {
        const query = new URLSearchParams();
        if (params.page !== undefined) query.append("page", params.page);
        if (params.size !== undefined) query.append("size", params.size);
        if (params.startDate) query.append("startDate", params.startDate);
        if (params.endDate) query.append("endDate", params.endDate);
        if (params.search) query.append("search", params.search);
        if (params.services && params.services.length > 0) {
            params.services.forEach(service => query.append("services", service));
        }

        return await api.get(`/service-orders?${query.toString()}`, { signal });
    },

    create: async (order) => {
        return await api.post(`/service-orders`, order);
    },

    updateStatus: async (id, status) => {
        return await api.patch(`/service-orders/${id}/status`, status);
    },

    update: async (id, data) => {
        return await api.put(`/service-orders/${id}`, data);
    }
};
