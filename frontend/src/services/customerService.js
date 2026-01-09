import { api } from "./api";

export const customerService = {
    getAll: async () => {
        return await api.get("/customers");
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
