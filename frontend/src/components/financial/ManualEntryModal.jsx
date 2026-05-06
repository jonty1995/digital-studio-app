import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { financialService } from "../../services/financialService";

export function ManualEntryModal({ isOpen, onClose, accounts, onSuccess, showAlert }) {
    const [activeTab, setActiveTab] = useState("initial"); // "initial" or "transfer"
    const [loading, setLoading] = useState(false);

    // Initial Amount State
    const [initialAmountData, setInitialAmountData] = useState({
        id: null,
        accountId: "",
        type: "CREDIT",
        amount: ""
    });

    // Transfer State
    const [transferData, setTransferData] = useState({
        fromAccountId: "",
        toAccountId: "",
        amount: "",
        description: ""
    });
    
    // Debit State
    const [debitData, setDebitData] = useState({
        accountId: "",
        purpose: "Personal Use",
        description: "",
        amount: ""
    });

    const eligibleInitialAccounts = accounts.filter(acc => acc.canEditInitialAmount);

    useEffect(() => {
        if (!isOpen) {
            setActiveTab("initial");
            setInitialAmountData({ id: null, accountId: "", type: "CREDIT", amount: "" });
            setTransferData({ fromAccountId: "", toAccountId: "", amount: "", description: "" });
            setDebitData({ accountId: "", purpose: "Personal Use", description: "", amount: "" });
        }
    }, [isOpen]);

    const handleAccountChange = async (accountId) => {
        setInitialAmountData(prev => ({ ...prev, accountId, id: null, amount: "", type: "CREDIT" }));
        
        if (!accountId) return;

        const account = accounts.find(acc => acc.id === accountId);
        if (account?.initialTransactionId) {
            setLoading(true);
            try {
                const txn = await financialService.getTransaction(account.initialTransactionId);
                if (txn) {
                    setInitialAmountData({
                        id: txn.id,
                        accountId: accountId,
                        type: txn.type,
                        amount: txn.amount.toString()
                    });
                }
            } catch (e) {
                console.error("Failed to load initial amount", e);
                showAlert("Error", "Failed to load existing initial amount.");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleInitialAmountSubmit = async (e) => {
        e.preventDefault();
        if (!initialAmountData.accountId || !initialAmountData.amount) {
            showAlert("Validation Error", "Please select an account and enter an amount.");
            return;
        }

        const amountNum = parseFloat(initialAmountData.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            showAlert("Validation Error", "Amount must be greater than zero.");
            return;
        }

        setLoading(true);
        try {
            await financialService.recordTransaction({
                id: initialAmountData.id,
                accountId: initialAmountData.accountId,
                amount: amountNum,
                type: initialAmountData.type,
                category: "Other",
                paymentMode: "BANK", // Defaulting to BANK
                description: "INITIAL_AMOUNT"
            });
            onSuccess();
            onClose();
        } catch (e) {
            console.error("Failed to record initial amount", e);
            showAlert("Error", "Failed to record initial amount.");
        } finally {
            setLoading(false);
        }
    };

    const handleTransferSubmit = async (e) => {
        e.preventDefault();
        if (!transferData.fromAccountId || !transferData.toAccountId || !transferData.amount) {
            showAlert("Validation Error", "Please fill all required fields.");
            return;
        }

        if (transferData.fromAccountId === transferData.toAccountId) {
            showAlert("Validation Error", "Cannot transfer to the same account.");
            return;
        }

        const amountNum = parseFloat(transferData.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            showAlert("Validation Error", "Amount must be greater than zero.");
            return;
        }

        const fromAccount = accounts.find(a => a.id === transferData.fromAccountId);
        if (fromAccount && amountNum > (fromAccount.balance || 0)) {
            showAlert("Insufficient Funds", `Transfer amount (₹${amountNum.toLocaleString()}) exceeds available balance (₹${(fromAccount.balance || 0).toLocaleString()}) in ${fromAccount.name}.`);
            return;
        }

        setLoading(true);
        try {
            await financialService.recordTransfer({
                fromAccountId: transferData.fromAccountId,
                toAccountId: transferData.toAccountId,
                amount: amountNum,
                description: transferData.description
            });
            onSuccess();
            onClose();
        } catch (e) {
            console.error("Failed to record transfer", e);
            showAlert("Error", "Failed to record transfer.");
        } finally {
            setLoading(false);
        }
    };
    const handleDebitSubmit = async (e) => {
        e.preventDefault();
        if (!debitData.accountId || !debitData.amount) {
            showAlert("Validation Error", "Please select an account and enter an amount.");
            return;
        }

        const amountNum = parseFloat(debitData.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            showAlert("Validation Error", "Amount must be greater than zero.");
            return;
        }

        const account = accounts.find(a => a.id === debitData.accountId);
        if (account && amountNum > (account.balance || 0)) {
            showAlert("Insufficient Funds", `Debit amount (₹${amountNum.toLocaleString()}) exceeds available balance (₹${(account.balance || 0).toLocaleString()}) in ${account.name}.`);
            return;
        }

        setLoading(true);
        try {
            await financialService.recordTransaction({
                accountId: debitData.accountId,
                amount: amountNum,
                type: "DEBIT",
                category: debitData.purpose,
                paymentMode: "OTHER",
                description: debitData.description || debitData.purpose
            });
            onSuccess();
            onClose();
        } catch (e) {
            console.error("Failed to record debit", e);
            showAlert("Error", "Failed to record debit.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Manual Entry"
        >
            <div className="space-y-4">
                <div className="flex bg-muted/50 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab("initial")}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'initial' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Initial Amount
                    </button>
                    <button
                        onClick={() => setActiveTab("transfer")}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'transfer' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Transfer
                    </button>
                    <button
                        onClick={() => setActiveTab("debit")}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'debit' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Debit
                    </button>
                </div>

                {activeTab === "initial" && (
                    <form onSubmit={handleInitialAmountSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Account</label>
                            <select
                                className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                                value={initialAmountData.accountId}
                                onChange={(e) => handleAccountChange(e.target.value)}
                            >
                                <option value="">Select Account</option>
                                {eligibleInitialAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.accountType.replace('_', ' ')})</option>
                                ))}
                            </select>
                            {initialAmountData.accountId && (
                                <p className="text-xs font-bold text-muted-foreground mt-1">
                                    Current Balance: <span className={(eligibleInitialAccounts.find(a => a.id === initialAmountData.accountId)?.balance || 0) < 0 ? 'text-red-500' : 'text-emerald-600'}>
                                        ₹{(eligibleInitialAccounts.find(a => a.id === initialAmountData.accountId)?.balance || 0).toLocaleString()}
                                    </span>
                                </p>
                            )}
                            {eligibleInitialAccounts.length === 0 && (
                                <p className="text-xs text-muted-foreground">No accounts available (all have existing transactions).</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Type</label>
                            <select
                                className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                                value={initialAmountData.type}
                                onChange={(e) => setInitialAmountData(prev => ({ ...prev, type: e.target.value }))}
                            >
                                <option value="CREDIT">Credit (Positive Balance)</option>
                                <option value="DEBIT">Debit (Negative Balance / Debt)</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Amount</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                                value={initialAmountData.amount}
                                onChange={(e) => setInitialAmountData(prev => ({ ...prev, amount: e.target.value }))}
                            />
                        </div>
                        <div className="pt-2 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                            <Button type="submit" disabled={loading || !initialAmountData.accountId || !initialAmountData.amount}>
                                {initialAmountData.id ? "Update Initial Amount" : "Save Initial Amount"}
                            </Button>
                        </div>
                    </form>
                )}

                {activeTab === "transfer" && (
                    <form onSubmit={handleTransferSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">From Account</label>
                                <select
                                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                                    value={transferData.fromAccountId}
                                    onChange={(e) => setTransferData(prev => ({ ...prev, fromAccountId: e.target.value }))}
                                >
                                    <option value="">Select Source</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                                {transferData.fromAccountId && (
                                    <p className="text-xs font-bold text-muted-foreground mt-1">
                                        Current Balance: <span className={(accounts.find(a => a.id === transferData.fromAccountId)?.balance || 0) < 0 ? 'text-red-500' : 'text-emerald-600'}>
                                            ₹{(accounts.find(a => a.id === transferData.fromAccountId)?.balance || 0).toLocaleString()}
                                        </span>
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">To Account</label>
                                <select
                                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                                    value={transferData.toAccountId}
                                    onChange={(e) => setTransferData(prev => ({ ...prev, toAccountId: e.target.value }))}
                                    disabled={!transferData.fromAccountId}
                                >
                                    <option value="">Select Destination</option>
                                    {accounts.filter(acc => acc.id !== transferData.fromAccountId).map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                                {transferData.toAccountId && (
                                    <p className="text-xs font-bold text-muted-foreground mt-1">
                                        Current Balance: <span className={(accounts.find(a => a.id === transferData.toAccountId)?.balance || 0) < 0 ? 'text-red-500' : 'text-emerald-600'}>
                                            ₹{(accounts.find(a => a.id === transferData.toAccountId)?.balance || 0).toLocaleString()}
                                        </span>
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Amount</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                                value={transferData.amount}
                                onChange={(e) => setTransferData(prev => ({ ...prev, amount: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Description (Optional)</label>
                            <textarea
                                placeholder="Add a note..."
                                className="w-full bg-background border rounded-lg px-3 py-2 text-sm h-20 resize-none"
                                value={transferData.description}
                                onChange={(e) => setTransferData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div className="pt-2 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                            <Button type="submit" disabled={loading || !transferData.fromAccountId || !transferData.toAccountId || !transferData.amount}>
                                Save Transfer
                            </Button>
                        </div>
                    </form>
                )}

                {activeTab === "debit" && (
                    <form onSubmit={handleDebitSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Account</label>
                            <select
                                className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                                value={debitData.accountId}
                                onChange={(e) => setDebitData(prev => ({ ...prev, accountId: e.target.value }))}
                            >
                                <option value="">Select Account</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.accountType.replace('_', ' ')})</option>
                                ))}
                            </select>
                            {debitData.accountId && (
                                <p className="text-xs font-bold text-muted-foreground mt-1">
                                    Current Balance: <span className={(accounts.find(a => a.id === debitData.accountId)?.balance || 0) < 0 ? 'text-red-500' : 'text-emerald-600'}>
                                        ₹{(accounts.find(a => a.id === debitData.accountId)?.balance || 0).toLocaleString()}
                                    </span>
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Purpose</label>
                            <select
                                className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                                value={debitData.purpose}
                                onChange={(e) => setDebitData(prev => ({ ...prev, purpose: e.target.value }))}
                            >
                                <option value="Personal Use">Personal Use</option>
                                <option value="Payment">Payment</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Amount</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0.00"
                                className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                                value={debitData.amount}
                                onChange={(e) => setDebitData(prev => ({ ...prev, amount: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Description (Optional)</label>
                            <textarea
                                placeholder="Add a note..."
                                className="w-full bg-background border rounded-lg px-3 py-2 text-sm h-20 resize-none"
                                value={debitData.description}
                                onChange={(e) => setDebitData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div className="pt-2 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                            <Button type="submit" disabled={loading || !debitData.accountId || !debitData.amount}>
                                Save Debit
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
}
