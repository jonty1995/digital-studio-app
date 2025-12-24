import { api } from "./api";

export const customerService = {
    // Fetch a unique sequence number from the backend
    getUniqueSequence: async (instanceId) => {
        // Expecting { sequence: 123 }
        const data = await api.get(`/customers/sequence?instanceId=${instanceId}`);
        return data.sequence;
    }
}
