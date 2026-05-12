import { useState, useEffect } from "react";
import { financialService } from "../../services/financialService";
import { Plus, Trash2, CreditCard as CardIcon, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";

export function AccountConfig({ showAlert, canAdd, canEdit, canDelete }) {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingAccount, setEditingAccount] = useState(null);
    const [newAccount, setNewAccount] = useState({ name: "", accountType: "BANK_ACCOUNT", color: "#3b82f6" });

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const data = await financialService.getAccounts();
            setAccounts(data);
        } catch (e) {
            console.error(e);
            showAlert("Error", "Failed to fetch accounts.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!canAdd) {
            showAlert("Permission Denied", "You do not have permission to add accounts.");
            return;
        }
        if (!newAccount.name) return showAlert("Validation", "Account name is required.");
        
        if (newAccount.accountType === "IN_HAND") {
            const hasInHand = accounts.some(acc => acc.accountType === "IN_HAND");
            if (hasInHand) {
                return showAlert("Validation", "An 'In Hand' account already exists. Only one 'In Hand' account is permitted.");
            }
        }

        if (newAccount.accountType === "BANK_ACCOUNT") {
            const hasBank = accounts.some(acc => acc.accountType === "BANK_ACCOUNT");
            if (hasBank) {
                return showAlert("Validation", "A 'Bank Account' already exists. Only one 'Bank Account' is permitted.");
            }
        }

        try {
            await financialService.saveAccount(newAccount);
            fetchAccounts();
            setNewAccount({ name: "", accountType: "BANK_ACCOUNT", color: "#3b82f6" });
            showAlert("Success", "Account saved successfully.");
        } catch (e) {
            showAlert("Error", "Failed to save card.");
        }
    };

    const handleDelete = async (id) => {
        if (!canDelete) {
            showAlert("Permission Denied", "You do not have permission to delete accounts.");
            return;
        }
        if (!window.confirm("Are you sure you want to delete this account?")) return;
        try {
            await financialService.deleteAccount(id);
            fetchAccounts();
        } catch (e) {
            showAlert("Error", "Failed to delete account.");
        }
    };



    return (
        <div className="space-y-6">
            <div className={`bg-card border rounded-lg p-4 space-y-4 ${!canAdd ? 'opacity-50' : ''}`}>
                <h3 className="text-sm font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Account
                </h3>
                <div className="grid grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Account Name</label>
                        <input
                            type="text"
                            value={newAccount.name}
                            onChange={e => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-background border rounded px-3 py-1.5 text-sm"
                            placeholder="e.g. HDFC Main"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Account Type</label>
                        <select
                            value={newAccount.accountType}
                            onChange={e => setNewAccount(prev => ({ ...prev, accountType: e.target.value }))}
                            className="w-full bg-background border rounded px-3 py-1.5 text-sm"
                        >
                            <option value="IN_HAND">In Hand</option>
                            <option value="POT">Pot</option>
                            <option value="BANK_ACCOUNT">Bank Account</option>
                            <option value="CREDIT_CARD">Credit Card</option>
                            <option value="DEBIT_CARD">Debit Card</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Color</label>
                        <input
                            type="color"
                            value={newAccount.color}
                            onChange={e => setNewAccount(prev => ({ ...prev, color: e.target.value }))}
                            className="w-full h-9 bg-background border rounded px-1 py-1 cursor-pointer"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button onClick={handleSave} size="sm" className="w-full">Save Account</Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map(account => (
                    <div key={account.id} className="bg-card border rounded-lg overflow-hidden group">
                        <div className="h-2" style={{ backgroundColor: account.color }}></div>
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                        <CardIcon className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-sm">{account.name}</h4>
                                        <p className="text-xs text-muted-foreground">Type: {account.accountType.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                                    <button
                                        onClick={() => handleDelete(account.id)}
                                        className={`p-1.5 hover:bg-destructive/10 rounded text-destructive ${!canDelete ? 'opacity-50' : ''}`}
                                        title="Delete Account"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
