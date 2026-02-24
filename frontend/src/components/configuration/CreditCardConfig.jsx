import { useState, useEffect } from "react";
import { financialService } from "../../services/financialService";
import { Plus, Trash2, CreditCard as CardIcon, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";

export function CreditCardConfig({ showAlert }) {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCard, setEditingCard] = useState(null);
    const [newCard, setNewCard] = useState({ name: "", billingDate: 1, totalLimit: 0, color: "#3b82f6" });

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        try {
            const data = await financialService.getCards();
            setCards(data);
        } catch (e) {
            console.error(e);
            showAlert("Error", "Failed to fetch credit cards.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newCard.name) return showAlert("Validation", "Card name is required.");
        if (newCard.billingDate < 1 || newCard.billingDate > 31) return showAlert("Validation", "Billing date must be between 1 and 31.");

        try {
            await financialService.saveCard(newCard);
            fetchCards();
            setNewCard({ name: "", billingDate: 1, totalLimit: 0, color: "#3b82f6" });
            showAlert("Success", "Card saved successfully.");
        } catch (e) {
            showAlert("Error", "Failed to save card.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this card?")) return;
        try {
            await financialService.deleteCard(id);
            fetchCards();
        } catch (e) {
            showAlert("Error", "Failed to delete card.");
        }
    };

    const handleReset = async (id) => {
        if (!window.confirm("This will reset the unbilled amount and mark the current cycle as paid. Proceed?")) return;
        try {
            await financialService.markCardAsPaid(id);
            fetchCards();
            showAlert("Success", "Statement reset successfully.");
        } catch (e) {
            showAlert("Error", "Failed to reset statement.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-card border rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Credit Card
                </h3>
                <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Card Name</label>
                        <input
                            type="text"
                            value={newCard.name}
                            onChange={e => setNewCard(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-background border rounded px-3 py-1.5 text-sm"
                            placeholder="e.g. HDFC Millennia"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Billing Date</label>
                        <input
                            type="number"
                            min="1"
                            max="31"
                            value={newCard.billingDate}
                            onChange={e => setNewCard(prev => ({ ...prev, billingDate: parseInt(e.target.value) }))}
                            className="w-full bg-background border rounded px-3 py-1.5 text-sm"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Color</label>
                        <input
                            type="color"
                            value={newCard.color}
                            onChange={e => setNewCard(prev => ({ ...prev, color: e.target.value }))}
                            className="w-full h-9 bg-background border rounded px-1 py-1 cursor-pointer"
                        />
                    </div>
                    <div className="flex items-end">
                        <Button onClick={handleSave} size="sm" className="w-full">Save Card</Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map(card => (
                    <div key={card.id} className="bg-card border rounded-lg overflow-hidden group">
                        <div className="h-2" style={{ backgroundColor: card.color }}></div>
                        <div className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                        <CardIcon className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-sm">{card.name}</h4>
                                        <p className="text-xs text-muted-foreground">Billing: {card.billingDate}th</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleReset(card.id)}
                                        className="p-1.5 hover:bg-muted rounded text-blue-500"
                                        title="Mark as Paid / Reset Statement"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(card.id)}
                                        className="p-1.5 hover:bg-destructive/10 rounded text-destructive"
                                        title="Delete Card"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="pt-2 border-t flex justify-between items-center text-xs">
                                <span className="text-muted-foreground">Last Reset:</span>
                                <span className="font-medium">
                                    {card.lastRepaymentDate ? new Date(card.lastRepaymentDate).toLocaleDateString() : "Never"}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
