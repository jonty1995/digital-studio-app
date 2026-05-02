import { api } from "./api";

export const moneyTransferService = {
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

        return await api.get(`/money-transfers?${query.toString()}`, { signal });
    },

    create: async (transfer) => {
        return await api.post(`/money-transfers`, transfer);
    },

    updateStatus: async (id, status, profit = null, profitType = null, finalAmount = null) => {
        let url = `/money-transfers/${id}/status`;
        const params = new URLSearchParams();
        if (profit !== null) params.append("profit", profit);
        if (profitType !== null) params.append("profitType", profitType);
        if (finalAmount !== null) params.append("finalAmount", finalAmount);
        
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;
        
        return await api.patch(url, status);
    },

    update: async (id, data) => {
        return await api.put(`/money-transfers/${id}`, data);
    },

    getSuggestions: async (mobile) => {
        return await api.get(`/money-transfers/suggestions?mobile=${mobile}`);
    }
};
