import { api } from "./api";

export const financialService = {
    // Account Management
    getAccounts: () => api.get("/financial/accounts"),
    saveAccount: (account) => api.post("/financial/accounts", account),
    deleteAccount: (id) => api.delete(`/financial/accounts/${id}`),
    markAccountAsPaid: (id) => api.post(`/financial/accounts/${id}/pay`),
    getUnbilledAmount: (id) => api.get(`/financial/accounts/${id}/unbilled`),

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
    linkTransactionToAccount: (txnId, accountId) => {
        const url = accountId
            ? `/financial/transactions/${txnId}/link-account?accountId=${accountId}`
            : `/financial/transactions/${txnId}/link-account`;
        return api.put(url);
    },
};
