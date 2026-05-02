import { api } from "./api";

export const trainBookingService = {
    getAll: async (params, signal) => {
        const query = new URLSearchParams();
        if (params.page !== undefined) query.append("page", params.page);
        if (params.size !== undefined) query.append("size", params.size);
        if (params.startDate) query.append("startDate", params.startDate);
        if (params.endDate) query.append("endDate", params.endDate);
        if (params.search) query.append("search", params.search);

        return await api.get(`/train-bookings?${query.toString()}`, { signal });
    },

    create: async (booking) => {
        return await api.post(`/train-bookings`, booking);
    },

    updateStatus: async (id, status, profit, profitType, finalAmount) => {
        const query = new URLSearchParams();
        query.append("status", status);
        if (profit !== undefined && profit !== null) query.append("profit", profit);
        if (profitType !== undefined && profitType !== null) query.append("profitType", profitType);
        if (finalAmount !== undefined && finalAmount !== null) query.append("finalAmount", finalAmount);
        
        const url = `/train-bookings/${id}/status?${query.toString()}`;
        return await api.patch(url);
    },

    update: async (id, data) => {
        return await api.patch(`/train-bookings/${id}`, data);
    },
    
    getSuggestions: async (mobile) => {
        return await api.get(`/train-bookings/suggestions?mobile=${mobile}`);
    }
};
