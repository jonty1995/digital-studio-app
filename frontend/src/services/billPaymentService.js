

export const billPaymentService = {
    getAll: async (params, signal) => {
        // params: { page, size, startDate, endDate, search }
        const query = new URLSearchParams();
        if (params.page !== undefined) query.append("page", params.page);
        if (params.size !== undefined) query.append("size", params.size);
        if (params.startDate) query.append("startDate", params.startDate);
        if (params.endDate) query.append("endDate", params.endDate);
        if (params.search) query.append("search", params.search);
        if (params.types && params.types.length > 0) {
            params.types.forEach(type => query.append("types", type));
        }

        // Use relative path to leverage Vite proxy
        const response = await fetch(`/api/bill-payments?${query.toString()}`, { signal });
        if (!response.ok) {
            const text = await response.text();
            console.error("API Error Response:", text);
            throw new Error(`Failed to fetch bill payments: ${response.status} ${response.statusText}`);
        }
        return response.json();
    },

    create: async (transaction) => {
        const response = await fetch(`/api/bill-payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(transaction),
        });
        if (!response.ok) {
            const text = await response.text();
            console.error("API Error Response:", text);
            throw new Error(`Failed to create bill payment: ${response.status} ${response.statusText}`);
        }
        return response.json();
    },

    updateStatus: async (id, status) => {
        const response = await fetch(`/api/bill-payments/${id}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: status, // Send plain string
        });
        if (!response.ok) {
            throw new Error(`Failed to update status: ${response.statusText}`);
        }
        return response.json();
    },

    update: async (id, data) => {
        const response = await fetch(`/api/bill-payments/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            throw new Error(`Failed to update transaction: ${response.statusText}`);
        }
        return response.json();
    },

    delete: async (id) => {
        const response = await fetch(`/api/bill-payments/${id}`, {
            method: "DELETE",
        });
        if (!response.ok) {
            throw new Error("Failed to delete bill payment");
        }
        return true;
    },

    getSuggestions: async (mobile) => {
        const query = new URLSearchParams({ mobile });
        const response = await fetch(`/api/bill-payments/suggestions?${query.toString()}`);
        if (!response.ok) {
            throw new Error("Failed to fetch suggestions");
        }
        return response.json();
    }
};
