

export const billPaymentService = {
    getAll: async (params) => {
        // params: { page, size, startDate, endDate, search }
        const query = new URLSearchParams();
        if (params.page !== undefined) query.append("page", params.page);
        if (params.size !== undefined) query.append("size", params.size);
        if (params.startDate) query.append("startDate", params.startDate);
        if (params.endDate) query.append("endDate", params.endDate);
        if (params.search) query.append("search", params.search);

        // Use relative path to leverage Vite proxy
        const response = await fetch(`/api/bill-payments?${query.toString()}`);
        if (!response.ok) {
            const text = await response.text();
            console.error("API Error Response:", text);
            throw new Error(`Failed to fetch bill payments: ${response.status} ${response.statusText}`);
        }
        return response.json();
    },

    create: async (transaction) => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/bill-payments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(transaction),
        });
        if (!response.ok) throw new Error("Failed to create bill payment");
        return response.json();
    },

    delete: async (id) => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/bill-payments/${id}`, {
            method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete bill payment");
    }
};
