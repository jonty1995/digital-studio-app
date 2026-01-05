import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, X, Check, Loader2 } from "lucide-react";

import { configurationService } from "@/services/configurationService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function PhotoItemConfig() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });

    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        try {
            const data = await configurationService.getItems();
            // Store originalName for safe renaming
            setItems(data.map(i => ({ ...i, originalName: i.name })));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        const newId = Date.now(); // Temp numeric ID
        const newItem = {
            id: newId,
            name: "",
            originalName: "", // New item has no original name
            regularBasePrice: 0,
            regularCustomerPrice: 0,
            instantBasePrice: 0,
            instantCustomerPrice: 0
        };
        setItems([...items, newItem]);
        setEditingId(newId);
        // Scroll to bottom
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    };

    const handleChange = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    const handleSave = async (silent = false) => {
        setSaving(true);
        try {
            // Clean up IDs? Backend regenerates them anyway based on name hash.
            await configurationService.saveItems(items);
            if (!silent) showAlert("Success", "Items saved successfully.");
            await loadItems(); // Refresh to sync IDs
        } catch (e) {
            console.error(e);
            showAlert("Error", "Failed to save items.");
            await loadItems(); // Revert
        } finally {
            setSaving(false);
        }
    };

    const handleRowSave = async (id) => {
        const item = items.find(i => i.id === id);
        if (!item.name) {
            showAlert("Missing Name", "Item name is required.");
            return;
        }

        // Check duplicates (excluding current item)
        const nameExists = items.some(i => i.name.toLowerCase() === item.name.toLowerCase() && i.id !== id);
        if (nameExists) {
            showAlert("Duplicate Name", "Item name must be unique.");
            return;
        }

        await handleSave(true);
        setEditingId(null);
    };

    const handleCancel = async () => {
        await loadItems(); // Revert changes
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        const newItems = items.filter(i => i.id !== id);
        setItems(newItems);
        // We need to persist deletion immediately to match other configs
        setSaving(true);
        try {
            await configurationService.saveItems(newItems);
            // Don't reload immediately, just keep state? Or reload to be safe.
            // loading items might bring it back if save failed?
        } catch (e) {
            console.error(e);
            showAlert("Error", "Failed to delete item.");
            loadItems();
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center">
                <Button onClick={handleAdd} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Item
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[200px]">Item Name</TableHead>
                            <TableHead className="text-right">Regular Base</TableHead>
                            <TableHead className="text-right">Regular Cust.</TableHead>
                            <TableHead className="text-right">Instant Base</TableHead>
                            <TableHead className="text-right">Instant Cust.</TableHead>
                            <TableHead className="text-right w-[100px]">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                                    No photo items configured.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => {
                                const isEditing = editingId === item.id;
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    value={item.name}
                                                    onChange={(e) => handleChange(item.id, "name", e.target.value)}
                                                    placeholder="Item Name"
                                                />
                                            ) : (
                                                <span className="font-medium">{item.name}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={item.regularBasePrice}
                                                    onChange={(e) => handleChange(item.id, "regularBasePrice", e.target.value)}
                                                    className="text-right"
                                                />
                                            ) : (
                                                <div className="text-right">{item.regularBasePrice}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={item.regularCustomerPrice}
                                                    onChange={(e) => handleChange(item.id, "regularCustomerPrice", e.target.value)}
                                                    className="text-right"
                                                />
                                            ) : (
                                                <div className="text-right">{item.regularCustomerPrice}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={item.instantBasePrice}
                                                    onChange={(e) => handleChange(item.id, "instantBasePrice", e.target.value)}
                                                    className="text-right"
                                                />
                                            ) : (
                                                <div className="text-right">{item.instantBasePrice}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    value={item.instantCustomerPrice}
                                                    onChange={(e) => handleChange(item.id, "instantCustomerPrice", e.target.value)}
                                                    className="text-right"
                                                />
                                            ) : (
                                                <div className="text-right">{item.instantCustomerPrice}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {isEditing ? (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRowSave(item.id)}
                                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                            disabled={saving}
                                                        >
                                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleCancel}
                                                            className="text-muted-foreground hover:text-foreground"
                                                            disabled={saving}
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setEditingId(item.id)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(item.id)}
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
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
