import { api } from "./api";

export const customerService = {
    getAll: async () => {
        return await api.get("/customers");
    },
    getAllPaginated: async ({ page, size, search }, signal) => {
        const query = new URLSearchParams();
        if (page !== undefined) query.append("page", page);
        if (size !== undefined) query.append("size", size);
        if (search) query.append("search", search);
        return await api.get(`/customers?${query.toString()}`, { signal });
    },
    getUniqueSequence: async (instanceId) => {
        return await api.get(`/customers/sequence?instanceId=${instanceId}`);
    },
    search: async (query) => {
        console.log("customerService.search called with:", query);
        return await api.get(`/customers/search?query=${query}`);
    },
    getSuggestions: async (query) => {
        return await api.get(`/customers/suggestions?query=${query}`);
    }
};
