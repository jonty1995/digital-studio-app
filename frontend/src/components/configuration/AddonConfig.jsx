import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, X, Check, Loader2 } from "lucide-react";

import { configurationService } from "@/services/configurationService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function AddonConfig() {
    const [addons, setAddons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });

    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    useEffect(() => {
        loadAddons();
    }, []);

    const loadAddons = async () => {
        setLoading(true);
        try {
            const data = await configurationService.getAddons();
            setAddons(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        const newId = Date.now();
        const newAddon = { id: newId, name: "" };
        setAddons([...addons, newAddon]);
        setEditingId(newId);
        // Scroll to bottom
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
    };

    const handleChange = (id, value) => {
        setAddons(addons.map(item => {
            if (item.id === id) {
                return { ...item, name: value };
            }
            return item;
        }));
    };

    const handleSave = async (silent = false) => {
        setSaving(true);
        try {
            await configurationService.saveAddons(addons);
            if (!silent) showAlert("Success", "Addons saved successfully.");
            await loadAddons(); // Refresh to sync IDs
        } catch (e) {
            console.error(e);
            showAlert("Error", "Failed to save addons.");
            await loadAddons(); // Revert
        } finally {
            setSaving(false);
        }
    };

    const handleRowSave = async (id) => {
        const item = addons.find(i => i.id === id);
        if (!item.name) {
            showAlert("Missing Name", "Addon name is required.");
            return;
        }

        // Check duplicates (excluding current item)
        const nameExists = addons.some(i => i.name.toLowerCase() === item.name.toLowerCase() && i.id !== id);
        if (nameExists) {
            showAlert("Duplicate Name", "Addon name must be unique.");
            return;
        }

        await handleSave(true);
        setEditingId(null);
    };

    const handleCancel = async () => {
        await loadAddons(); // Revert changes
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        const newAddons = addons.filter(i => i.id !== id);
        setAddons(newAddons);
        setSaving(true);
        try {
            await configurationService.saveAddons(newAddons);
        } catch (e) {
            console.error(e);
            showAlert("Error", "Failed to delete addon.");
            loadAddons();
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center max-w-lg">
                <Button onClick={handleAdd} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Addon
                </Button>
            </div>

            <div className="rounded-md border max-w-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Addon Name</TableHead>
                            <TableHead className="text-right w-[100px]">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {addons.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                    No addons configured.
                                </TableCell>
                            </TableRow>
                        ) : (
                            addons.map((item) => {
                                const isEditing = editingId === item.id;
                                return (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    value={item.name}
                                                    onChange={(e) => handleChange(item.id, e.target.value)}
                                                    placeholder="Addon Name"
                                                />
                                            ) : (
                                                <span className="font-medium">{item.name}</span>
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
        </div>
    );
}
