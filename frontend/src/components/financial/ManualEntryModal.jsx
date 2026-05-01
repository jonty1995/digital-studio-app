import { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { financialService } from "../../services/financialService";

export function ManualEntryModal({ isOpen, onClose, accounts, onSuccess, showAlert }) {
    const [activeTab, setActiveTab] = useState("initial"); // "initial" or "transfer"
    const [loading, setLoading] = useState(false);

    // Initial Amount State
    const [initialAmountData, setInitialAmountData] = useState({
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

    const eligibleInitialAccounts = accounts.filter(acc => !acc.hasTransactions);

    useEffect(() => {
        if (!isOpen) {
            setActiveTab("initial");
            setInitialAmountData({ accountId: "", type: "CREDIT", amount: "" });
            setTransferData({ fromAccountId: "", toAccountId: "", amount: "", description: "" });
        }
    }, [isOpen]);

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
                accountId: initialAmountData.accountId,
                amount: amountNum,
                type: initialAmountData.type,
                category: "MANUAL",
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
                </div>

                {activeTab === "initial" && (
                    <form onSubmit={handleInitialAmountSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Account</label>
                            <select
                                className="w-full bg-background border rounded-lg px-3 py-2 text-sm"
                                value={initialAmountData.accountId}
                                onChange={(e) => setInitialAmountData(prev => ({ ...prev, accountId: e.target.value }))}
                            >
                                <option value="">Select Account</option>
                                {eligibleInitialAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.accountType.replace('_', ' ')})</option>
                                ))}
                            </select>
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
                                Save Initial Amount
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
            </div>
        </Modal>
    );
}
