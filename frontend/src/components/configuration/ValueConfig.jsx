import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, Loader2, Check, Edit2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { configurationService } from "@/services/configurationService";

export function ValueConfig({ canAdd, canEdit, canDelete }) {
    const [values, setValues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);

    // Alert State
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "" });
    const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, index: null, name: "" });

    const showAlert = (title, message) => {
        setAlertConfig({ isOpen: true, title, message });
    };

    useEffect(() => {
        fetchValues();
    }, []);

    const fetchValues = async () => {
        setLoading(true);
        try {
            const data = await configurationService.getValues();
            setValues(data || []);
        } catch (error) {
            console.error("Failed to load values", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        if (!canAdd) {
            showAlert("Permission Denied", "You do not have permission to add configuration.");
            return;
        }
        setValues([{ name: "", value: "", description: "" }, ...values]);
        setEditingIndex(0);
        // Scroll to top of the scrollable container
        const scrollContainer = document.querySelector('.overflow-y-auto.max-h-\\[calc\\(100vh-260px\\)\\]');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const initiateDelete = (index) => {
        if (!canDelete) {
            showAlert("Permission Denied", "You do not have permission to delete configuration.");
            return;
        }
        setConfirmConfig({
            isOpen: true,
            index,
            name: values[index].name || "this item"
        });
    };

    const confirmDelete = () => {
        const newValues = values.filter((_, i) => i !== confirmConfig.index);
        setValues(newValues);
        setConfirmConfig({ isOpen: false, index: null, name: "" });
    };

    const handleChange = (index, field, val) => {
        const newValues = [...values];
        newValues[index] = { ...newValues[index], [field]: val };
        setValues(newValues);
    };

    const handleSave = async (silent = false) => {
        setSaving(true);
        try {
            const data = await configurationService.saveValues(values);
            setValues(data || []);
            if (!silent) showAlert("Success", "Configuration saved successfully.");
        } catch (error) {
            console.error("Failed to save", error);
            showAlert("Error", "Failed to save configuration.");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (index) => {
        setEditingIndex(index);
    };

    const handleRowSave = async () => {
        await handleSave(true); // Silent save for row action
        setEditingIndex(null);
    };

    const handleCancel = async () => {
        // Revert changes by reloading from server
        await fetchValues();
        setEditingIndex(null);
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center">
                <Button 
                    onClick={handleAdd} 
                    size="sm" 
                    className={`gap-2 ${(!canAdd || editingIndex !== null) ? 'opacity-50' : ''}`}
                    disabled={!canAdd || editingIndex !== null}
                >
                    <Plus className="w-4 h-4" /> Add Configuration
                </Button>
            </div>

            <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="overflow-y-auto max-h-[calc(100vh-260px)]">
                        <Table className="w-full">
                            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                                <TableRow>
                                    <TableHead className="whitespace-nowrap">Config Name (Key)</TableHead>
                                    <TableHead className="whitespace-nowrap">Value</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="w-[100px] text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {values.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                            No configurations defined.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    values.map((item, index) => {
                                        const isEditing = editingIndex === index;
                                        return (
                                            <TableRow key={index}>
                                                <TableCell className="align-top">
                                                    {isEditing ? (
                                                        <Input
                                                            value={item.name}
                                                            onChange={(e) => handleChange(index, "name", e.target.value)}
                                                            placeholder="e.g. TaxRate"
                                                            className="min-w-[150px]"
                                                        />
                                                    ) : (
                                                        <div className="font-medium whitespace-nowrap">{item.name}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    {isEditing ? (
                                                        <Input
                                                            value={item.value}
                                                            onChange={(e) => handleChange(index, "value", e.target.value)}
                                                            placeholder="e.g. 18"
                                                            className="min-w-[150px]"
                                                        />
                                                    ) : (
                                                        <div className="whitespace-nowrap text-sm font-mono bg-slate-50 px-2 py-0.5 rounded border">{item.value}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="align-top min-w-[300px]">
                                                    {isEditing ? (
                                                        <Textarea
                                                            value={item.description || ""}
                                                            onChange={(e) => handleChange(index, "description", e.target.value)}
                                                            placeholder="Optional description..."
                                                            className="min-h-[60px]"
                                                        />
                                                    ) : (
                                                        <div className="whitespace-normal text-xs text-muted-foreground leading-relaxed">
                                                            {item.description || "-"}
                                                        </div>
                                                    )}
                                                </TableCell>
                                        <TableCell className="text-right align-top">
                                            <div className="flex justify-end gap-1">
                                                {isEditing ? (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleRowSave}
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
                                                                    showAlert("Permission Denied", "You do not have permission to edit configuration.");
                                                                    return;
                                                                }
                                                                handleEdit(index);
                                                            }}
                                                            className={!canEdit ? 'opacity-50' : ''}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => initiateDelete(index)}
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
            </div>

            {/* Delete Confirmation */}
            <SimpleAlert
                open={confirmConfig.isOpen}
                onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, isOpen: open }))}
                title="Confirm Delete"
                description={`Are you sure you want to delete the configuration '${confirmConfig.name}'? This action will remove it from the list. Remember to save changes to persist.`}
                type="confirm"
                confirmText="Delete"
                onConfirm={confirmDelete}
            />

            {/* Alert Dialog */}
            <SimpleAlert
                open={alertConfig.isOpen}
                onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, isOpen: open }))}
                title={alertConfig.title}
                description={alertConfig.message}
            />
        </div>
    );
}
