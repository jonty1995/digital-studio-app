import { api } from "./api";

export const financialService = {
    // Account Management
    getAccounts: () => api.get("/financial/accounts"),
    saveAccount: (account) => api.post("/financial/accounts", account),
    deleteAccount: (id) => api.delete(`/financial/accounts/${id}`),
    markAccountAsPaid: (id) => api.post(`/financial/accounts/${id}/pay`),
    getAccountBalance: (id) => api.get(`/financial/accounts/${id}/balance`),

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
    getTransaction: (id) => api.get(`/financial/transactions/${id}`),
    linkTransactionToAccount: (txnId, accountId) => {
        const url = accountId
            ? `/financial/transactions/${txnId}/link-account?accountId=${accountId}`
            : `/financial/transactions/${txnId}/link-account`;
        return api.put(url);
    },
    recordTransfer: (data) => api.post("/financial/transactions/transfer", data),
};
