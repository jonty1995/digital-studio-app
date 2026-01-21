export const serviceOrderService = {
    getAll: async (params) => {
        const query = new URLSearchParams();
        if (params.page !== undefined) query.append("page", params.page);
        if (params.size !== undefined) query.append("size", params.size);
        if (params.startDate) query.append("startDate", params.startDate);
        if (params.endDate) query.append("endDate", params.endDate);
        if (params.search) query.append("search", params.search);
        if (params.services && params.services.length > 0) {
            params.services.forEach(service => query.append("services", service));
        }

        const response = await fetch(`/api/service-orders?${query.toString()}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch service orders: ${response.status}`);
        }
        return response.json();
    },

    create: async (order) => {
        const response = await fetch(`/api/service-orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order),
        });
        if (!response.ok) {
            throw new Error(`Failed to create service order: ${response.status}`);
        }
        return response.json();
    },

    updateStatus: async (id, status) => {
        const response = await fetch(`/api/service-orders/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(status),
        });
        if (!response.ok) {
            throw new Error(`Failed to update status: ${response.status}`);
        }
        return response.json();
    },

    update: async (id, data) => {
        const response = await fetch(`/api/service-orders/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`Failed to update service order: ${response.status}`);
        }
        return response.json();
    }
};
