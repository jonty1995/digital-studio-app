import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, X, Check, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import { configurationService } from "@/services/configurationService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function PhotoItemConfig({ canAdd, canEdit, canDelete }) {
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
            setItems(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        if (!canAdd) {
            showAlert("Permission Denied", "You do not have permission to add new items.");
            return;
        }
        const newId = Date.now(); // Temp numeric ID
        const newItem = {
            id: newId,
            name: "",
            regularBasePrice: 0,
            regularCustomerPrice: 0,
            instantBasePrice: 0,
            instantCustomerPrice: 0,
            hasRegular: true,
            hasInstant: true
        };
        setItems([...items, newItem]);
        setEditingId(newId);
        // Scroll to bottom
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    };

    const handleChange = (id, field, value) => {
        // Restrict negative values for price fields
        if ((field.includes("Price")) && value < 0) {
            return;
        }

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
            // Sanitize items: If ID is numeric (temp ID), set it to null for backend
            const payload = items.map(i => ({
                ...i,
                id: (typeof i.id === 'string' && i.id.length > 20) ? i.id : null
            }));

            await configurationService.saveItems(payload);
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

        if (item.regularBasePrice < 0 || item.regularCustomerPrice < 0 ||
            item.instantBasePrice < 0 || item.instantCustomerPrice < 0) {
            showAlert("Invalid Prices", "Prices cannot be negative.");
            return;
        }

        if (item.hasRegular === false && item.hasInstant === false) {
            showAlert("Selection Required", "At least one pricing type (Regular or Instant) must be selected.");
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
        if (!canDelete) {
            showAlert("Permission Denied", "You do not have permission to delete items.");
            return;
        }
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
                <Button onClick={handleAdd} size="sm" className={`gap-2 ${!canAdd ? 'opacity-50' : ''}`}>
                    <Plus className="w-4 h-4" /> Add Item
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px]">Item Name</TableHead>
                            <TableHead className="text-center w-[80px]">Regular</TableHead>
                            <TableHead className="text-right">Reg. Base</TableHead>
                            <TableHead className="text-right">Reg. Cust.</TableHead>
                            <TableHead className="text-center w-[80px]">Instant</TableHead>
                            <TableHead className="text-right">Inst. Base</TableHead>
                            <TableHead className="text-right">Inst. Cust.</TableHead>
                            <TableHead className="text-right w-[100px]">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                                    No photo items configured.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item) => {
                                const isEditing = editingId === item.id;
                                // Default flags if null from backend
                                const hasRegular = item.hasRegular !== false;
                                const hasInstant = item.hasInstant !== false;

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
                                        {/* Regular Checkbox */}
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <Checkbox
                                                    checked={hasRegular}
                                                    disabled={!isEditing}
                                                    onCheckedChange={(checked) => handleChange(item.id, "hasRegular", checked)}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    onWheel={e => e.target.blur()}
                                                    value={item.regularBasePrice}
                                                    onChange={(e) => handleChange(item.id, "regularBasePrice", e.target.value)}
                                                    className="text-right"
                                                    disabled={!hasRegular}
                                                />
                                            ) : (
                                                <div className={`text-right ${!hasRegular ? 'opacity-20' : ''}`}>{item.regularBasePrice}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    onWheel={e => e.target.blur()}
                                                    value={item.regularCustomerPrice}
                                                    onChange={(e) => handleChange(item.id, "regularCustomerPrice", e.target.value)}
                                                    className="text-right"
                                                    disabled={!hasRegular}
                                                />
                                            ) : (
                                                <div className={`text-right ${!hasRegular ? 'opacity-20' : ''}`}>{item.regularCustomerPrice}</div>
                                            )}
                                        </TableCell>
                                        {/* Instant Checkbox */}
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <Checkbox
                                                    checked={hasInstant}
                                                    disabled={!isEditing}
                                                    onCheckedChange={(checked) => handleChange(item.id, "hasInstant", checked)}
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    onWheel={e => e.target.blur()}
                                                    value={item.instantBasePrice}
                                                    onChange={(e) => handleChange(item.id, "instantBasePrice", e.target.value)}
                                                    className="text-right"
                                                    disabled={!hasInstant}
                                                />
                                            ) : (
                                                <div className={`text-right ${!hasInstant ? 'opacity-20' : ''}`}>{item.instantBasePrice}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    onWheel={e => e.target.blur()}
                                                    value={item.instantCustomerPrice}
                                                    onChange={(e) => handleChange(item.id, "instantCustomerPrice", e.target.value)}
                                                    className="text-right"
                                                    disabled={!hasInstant}
                                                />
                                            ) : (
                                                <div className={`text-right ${!hasInstant ? 'opacity-20' : ''}`}>{item.instantCustomerPrice}</div>
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
                                                            onClick={() => {
                                                                if (!canEdit) {
                                                                    showAlert("Permission Denied", "You do not have permission to edit items.");
                                                                    return;
                                                                }
                                                                setEditingId(item.id);
                                                            }}
                                                            className={!canEdit ? 'opacity-50' : ''}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(item.id)}
                                                            className={`text-destructive hover:text-destructive hover:bg-destructive/10 ${!canDelete ? 'opacity-50' : ''}`}
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
