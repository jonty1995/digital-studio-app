import { api } from "./api";

export const customerService = {
    getAll: async () => {
        return await api.get("/customers");
    },
    getUniqueSequence: async (instanceId) => {
        return await api.get(`/customers/sequence?instanceId=${instanceId}`);
    }
};
