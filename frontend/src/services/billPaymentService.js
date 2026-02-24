import { api } from "./api";

export const billPaymentService = {
    getAll: async (params, signal) => {
        const query = new URLSearchParams();
        if (params.page !== undefined) query.append("page", params.page);
        if (params.size !== undefined) query.append("size", params.size);
        if (params.startDate) query.append("startDate", params.startDate);
        if (params.endDate) query.append("endDate", params.endDate);
        if (params.search) query.append("search", params.search);
        if (params.types && params.types.length > 0) {
            params.types.forEach(type => query.append("types", type));
        }

        return await api.get(`/bill-payments?${query.toString()}`, { signal });
    },

    create: async (transaction) => {
        return await api.post(`/bill-payments`, transaction);
    },

    updateStatus: async (id, status) => {
        return await api.patch(`/bill-payments/${id}/status`, status);
    },

    update: async (id, data) => {
        return await api.put(`/bill-payments/${id}`, data);
    },

    delete: async (id) => {
        return await api.delete(`/bill-payments/${id}`);
    },

    getSuggestions: async (mobile) => {
        return await api.get(`/bill-payments/suggestions?mobile=${mobile}`);
    }
};
