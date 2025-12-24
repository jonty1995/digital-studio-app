import { api } from "./api";

export const orderService = {
    createOrder: async (orderData) => {
        // orderData matches PhotoOrderRequest DTO: { customer, items, description, payment, image }
        return await api.post("/orders", orderData);
    },

    getAllOrders: async () => {
        return await api.get("/orders");
    }
};
