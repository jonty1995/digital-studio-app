import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, X, Check, Loader2 } from "lucide-react";

import { configurationService } from "@/services/configurationService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function ServiceConfig() {
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
            const data = await configurationService.getServiceItems();
            setItems(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        const newId = Date.now();
        const newItem = {
            id: newId,
            name: "",
            basePrice: 0,
            customerPrice: 0
        };
        setItems([...items, newItem]);
        setEditingId(newId);
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    };

    const handleChange = (id, field, value) => {
        // Restrict negative values for price fields
        if ((field === "basePrice" || field === "customerPrice") && value < 0) {
            return;
        }

        setItems(items.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                // Sync logic: copy customerPrice to basePrice automatically
                if (field === 'customerPrice') {
                    updatedItem.basePrice = value;
                }
                return updatedItem;
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

            await configurationService.saveServiceItems(payload);
            if (!silent) showAlert("Success", "Services saved successfully.");
            await loadItems();
        } catch (e) {
            console.error(e);
            showAlert("Error", "Failed to save services.");
            await loadItems();
        } finally {
            setSaving(false);
        }
    };

    const handleRowSave = async (id) => {
        const item = items.find(i => i.id === id);
        if (!item.name) {
            showAlert("Missing Name", "Service name is required.");
            return;
        }

        const nameExists = items.some(i => i.name.toLowerCase() === item.name.toLowerCase() && i.id !== id);
        if (nameExists) {
            showAlert("Duplicate Name", "Service name must be unique.");
            return;
        }

        // Validation: Base Price <= Customer Price
        const bPrice = parseFloat(item.basePrice) || 0;
        const cPrice = parseFloat(item.customerPrice) || 0;

        if (bPrice < 0 || cPrice < 0) {
            showAlert("Invalid Prices", "Prices cannot be negative.");
            return;
        }

        if (bPrice > cPrice) {
            showAlert("Invalid Prices", "Base Price cannot be greater than Customer Price.");
            return;
        }

        await handleSave(true);
        setEditingId(null);
    };

    const handleCancel = async () => {
        await loadItems();
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        const newItems = items.filter(i => i.id !== id);
        setItems(newItems);
        setSaving(true);
        try {
            await configurationService.saveServiceItems(newItems);
        } catch (e) {
            console.error(e);
            showAlert("Error", "Failed to delete service.");
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
                    <Plus className="w-4 h-4" /> Add Service
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Service Name</TableHead>
                            <TableHead className="text-right w-[150px]">Customer Price</TableHead>
                            <TableHead className="text-right w-[150px]">Base Price</TableHead>
                            <TableHead className="text-right w-[100px]">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                    No services configured.
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
                                                    placeholder="Service Name"
                                                />
                                            ) : (
                                                <span className="font-medium">{item.name}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    onWheel={e => e.target.blur()}
                                                    value={item.customerPrice}
                                                    onChange={(e) => handleChange(item.id, "customerPrice", e.target.value)}
                                                    className="text-right"
                                                />
                                            ) : (
                                                <div className="text-right font-medium text-primary">₹{Number(item.customerPrice || 0).toFixed(2)}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    onWheel={e => e.target.blur()}
                                                    value={item.basePrice}
                                                    onChange={(e) => handleChange(item.id, "basePrice", e.target.value)}
                                                    className="text-right"
                                                />
                                            ) : (
                                                <div className="text-right">₹{Number(item.basePrice || 0).toFixed(2)}</div>
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
