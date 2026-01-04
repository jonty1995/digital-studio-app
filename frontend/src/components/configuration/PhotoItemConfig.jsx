import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, X } from "lucide-react";

import { configurationService } from "@/services/configurationService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function PhotoItemConfig() {
    // Mock data for now
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState({ name: "", regularBasePrice: "", regularCustomerPrice: "", instantBasePrice: "", instantCustomerPrice: "" });
    const [editingId, setEditingId] = useState(null);
    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });

    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        const data = await configurationService.getItems();
        setItems(data);
    };

    const saveItems = async (newItems) => {
        setItems(newItems); // Optimistic update
        try {
            await configurationService.saveItems(newItems);
            loadItems(); // Refresh locally to get DB IDs
        } catch (e) {
            console.error(e);
            showAlert("Save Failed", "Failed to save items. Changes reverted.");
            loadItems(); // Revert to server state
        }
    }

    const handleSave = () => {
        if (!newItem.name) return;

        // Validation: Unique Name
        const nameExists = items.some(item =>
            item.name.toLowerCase() === newItem.name.toLowerCase() && item.id !== editingId
        );

        if (nameExists) {
            showAlert("Duplicate Name", "Item name must be unique.");
            return;
        }

        const parsePrice = (val) => {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? 0 : parsed;
        };

        const itemData = {
            name: newItem.name,
            regularBasePrice: parsePrice(newItem.regularBasePrice),
            regularCustomerPrice: parsePrice(newItem.regularCustomerPrice),
            instantBasePrice: parsePrice(newItem.instantBasePrice),
            instantCustomerPrice: parsePrice(newItem.instantCustomerPrice)
        };

        if (editingId) {
            saveItems(items.map(item => item.id === editingId ? { ...itemData, id: editingId } : item));
            setEditingId(null);
        } else {
            saveItems([...items, { ...itemData, id: Date.now() }]);
        }

        setNewItem({ name: "", regularBasePrice: "", regularCustomerPrice: "", instantBasePrice: "", instantCustomerPrice: "" });
    };

    const handleEdit = (item) => {
        setNewItem({
            name: item.name,
            regularBasePrice: item.regularBasePrice,
            regularCustomerPrice: item.regularCustomerPrice,
            instantBasePrice: item.instantBasePrice,
            instantCustomerPrice: item.instantCustomerPrice
        });
        setEditingId(item.id);
    };

    const handleCancelEdit = () => {
        setNewItem({ name: "", regularBasePrice: "", regularCustomerPrice: "", instantBasePrice: "", instantCustomerPrice: "" });
        setEditingId(null);
    };

    const handleDelete = (id) => {
        saveItems(items.filter(i => i.id !== id));
        if (editingId === id) handleCancelEdit();
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end border p-4 rounded-lg bg-card">
                <div className="md:col-span-2">
                    <label className="text-sm font-medium">Item Name</label>
                    <Input
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        placeholder="e.g. 4x6 Print"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Regular Base Price</label>
                    <Input
                        type="number"
                        step="1"
                        min="0"
                        onWheel={(e) => e.target.blur()}
                        value={newItem.regularBasePrice}
                        onChange={(e) => setNewItem({ ...newItem, regularBasePrice: e.target.value })}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Regular Customer Price</label>
                    <Input
                        type="number"
                        step="1"
                        min="0"
                        onWheel={(e) => e.target.blur()}
                        value={newItem.regularCustomerPrice}
                        onChange={(e) => setNewItem({ ...newItem, regularCustomerPrice: e.target.value })}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Instant Base Price</label>
                    <Input
                        type="number"
                        step="1"
                        min="0"
                        onWheel={(e) => e.target.blur()}
                        value={newItem.instantBasePrice}
                        onChange={(e) => setNewItem({ ...newItem, instantBasePrice: e.target.value })}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Instant Customer Price</label>
                    <Input
                        type="number"
                        step="1"
                        min="0"
                        onWheel={(e) => e.target.blur()}
                        value={newItem.instantCustomerPrice}
                        onChange={(e) => setNewItem({ ...newItem, instantCustomerPrice: e.target.value })}
                        placeholder="0"
                    />
                </div>

                <div className="md:col-span-6 flex justify-end gap-2">
                    {editingId && (
                        <Button onClick={handleCancelEdit} variant="outline" size="sm">
                            <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                    )}
                    <Button onClick={handleSave} size="sm">
                        {editingId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {editingId ? "Update Item" : "Add Item"}
                    </Button>
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="py-2 h-10">Item Name</TableHead>
                            <TableHead className="text-right py-2 h-10">Regular Base Price</TableHead>
                            <TableHead className="text-right py-2 h-10">Regular Customer Price</TableHead>
                            <TableHead className="text-right py-2 h-10">Instant Base Price</TableHead>
                            <TableHead className="text-right py-2 h-10">Instant Customer Price</TableHead>
                            <TableHead className="text-right w-[100px] py-2 h-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium py-2">{item.name}</TableCell>
                                <TableCell className="text-right py-2">{item.regularBasePrice}</TableCell>
                                <TableCell className="text-right py-2">{item.regularCustomerPrice}</TableCell>
                                <TableCell className="text-right py-2">{item.instantBasePrice}</TableCell>
                                <TableCell className="text-right py-2">{item.instantCustomerPrice}</TableCell>
                                <TableCell className="text-right space-x-1 py-2">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                                        <Edit2 className="w-4 h-4 text-primary" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                    No items configured.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <SimpleAlert
                open={alertState.open}
                onOpenChange={(open) => setAlertState(prev => ({ ...prev, open }))}
                title={alertState.title}
                description={alertState.description}
            />
        </div >
    );
}
