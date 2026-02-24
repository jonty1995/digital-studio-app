import { api } from "./api";

export const financialService = {
    // Credit Card Management
    getCards: () => api.get("/financial/cards"),
    saveCard: (card) => api.post("/financial/cards", card),
    deleteCard: (id) => api.delete(`/financial/cards/${id}`),
    markCardAsPaid: (id) => api.post(`/financial/cards/${id}/pay`),
    getUnbilledAmount: (id) => api.get(`/financial/cards/${id}/unbilled`),

    // Transactions
    getTransactions: (params) => {
        const query = new URLSearchParams(params).toString();
        return api.get(`/financial/transactions?${query}`);
    },
    getSummary: (params) => {
        const query = new URLSearchParams(params).toString();
        return api.get(`/financial/summary?${query}`);
    },
    recordTransaction: (txn) => api.post("/financial/transactions", txn),
    linkTransactionToCard: (txnId, cardId) => {
        const url = cardId
            ? `/financial/transactions/${txnId}/link-card?cardId=${cardId}`
            : `/financial/transactions/${txnId}/link-card`;
        return api.put(url);
    },
};
