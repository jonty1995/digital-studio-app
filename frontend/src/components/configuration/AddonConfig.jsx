import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, X, Check, Loader2 } from "lucide-react";

import { configurationService } from "@/services/configurationService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function AddonConfig({ canAdd, canEdit, canDelete }) {
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
        if (!canAdd) {
            showAlert("Permission Denied", "You do not have permission to add addons.");
            return;
        }
        const newId = Date.now();
        const newAddon = { id: newId, name: "" };
        setAddons([newAddon, ...addons]);
        setEditingId(newId);
        // Scroll to top of the scrollable container
        const scrollContainer = document.querySelector('.overflow-y-auto.max-h-\\[calc\\(100vh-260px\\)\\]');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
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
            // Sanitize IDs: New items have numeric timestamp IDs, remove them so backend generates UUIDs
            const payload = addons.map(a => (typeof a.id === 'number' ? { ...a, id: null } : a));
            await configurationService.saveAddons(payload);
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
        if (!canDelete) {
            showAlert("Permission Denied", "You do not have permission to delete addons.");
            return;
        }
        // Optimistic update
        const newAddons = addons.filter(i => i.id !== id);
        setAddons(newAddons);

        // If it was a temporary item (numeric ID), we don't need to call backend delete if it wasn't saved yet?
        // But the current logic treats the array as the source of truth.
        // If we delete a temp item that hasn't been saved, the backend doesn't know about it.
        // However, if we have OTHER pending temp items in the list, we must be careful.
        // The safest approach is to send the full list (sanitized) as the new state.

        setSaving(true);
        try {
            const payload = newAddons.map(a => (typeof a.id === 'number' ? { ...a, id: null } : a));
            await configurationService.saveAddons(payload);
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
                <Button 
                    onClick={handleAdd} 
                    size="sm" 
                    className={`gap-2 ${(!canAdd || editingId !== null) ? 'opacity-50' : ''}`}
                    disabled={!canAdd || editingId !== null}
                >
                    <Plus className="w-4 h-4" /> Add Addon
                </Button>
            </div>

            <div className="rounded-md border max-w-lg">
                <div className="overflow-y-auto max-h-[calc(100vh-260px)]">
                <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
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
                                                            onClick={() => {
                                                                if (!canEdit) {
                                                                    showAlert("Permission Denied", "You do not have permission to edit addons.");
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
