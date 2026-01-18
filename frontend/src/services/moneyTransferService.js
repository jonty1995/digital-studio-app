export const moneyTransferService = {
    getAll: async (params) => {
        const query = new URLSearchParams();
        if (params.page !== undefined) query.append("page", params.page);
        if (params.size !== undefined) query.append("size", params.size);
        if (params.startDate) query.append("startDate", params.startDate);
        if (params.endDate) query.append("endDate", params.endDate);
        if (params.search) query.append("search", params.search);
        if (params.types && params.types.length > 0) {
            params.types.forEach(type => query.append("types", type));
        }

        const response = await fetch(`/api/money-transfers?${query.toString()}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch money transfers: ${response.status}`);
        }
        return response.json();
    },

    create: async (transfer) => {
        const response = await fetch(`/api/money-transfers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(transfer),
        });
        if (!response.ok) {
            throw new Error(`Failed to create money transfer: ${response.status}`);
        }
        return response.json();
    },

    updateStatus: async (id, status) => {
        const response = await fetch(`/api/money-transfers/${id}/status`, {
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
        const response = await fetch(`/api/money-transfers/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`Failed to update transfer: ${response.status}`);
        }
        return response.json();
    }
};
