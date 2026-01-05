import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, Loader2, Check, Edit2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function ValueConfig() {
    const [values, setValues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingIndex, setEditingIndex] = useState(null);

    // Alert State
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "" });
    const showAlert = (title, message) => {
        setAlertConfig({ isOpen: true, title, message });
    };

    useEffect(() => {
        fetchValues();
    }, []);

    const fetchValues = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/config/values");
            if (res.ok) {
                setValues(await res.json());
            }
        } catch (error) {
            console.error("Failed to load values", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        const newIndex = values.length;
        setValues([...values, { name: "", value: "" }]);
        setEditingIndex(newIndex);
    };

    const handleDelete = (index) => {
        const newValues = values.filter((_, i) => i !== index);
        setValues(newValues);
    };

    const handleChange = (index, field, val) => {
        const newValues = [...values];
        newValues[index] = { ...newValues[index], [field]: val };
        setValues(newValues);
    };

    const handleSave = async (silent = false) => {
        setSaving(true);
        try {
            const res = await fetch("/api/config/values", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            if (res.ok) {
                setValues(await res.json());
                if (!silent) showAlert("Success", "Configuration saved successfully.");
            } else {
                showAlert("Error", "Failed to save configuration.");
            }
        } catch (error) {
            console.error("Failed to save", error);
            showAlert("Error", "An unexpected error occurred while saving.");
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
                <Button onClick={handleAdd} size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Configuration
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Config Name (Key)</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead className="w-[100px] text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {values.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                    No configurations defined.
                                </TableCell>
                            </TableRow>
                        ) : (
                            values.map((item, index) => {
                                const isEditing = editingIndex === index;
                                return (
                                    <TableRow key={index}>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    value={item.name}
                                                    onChange={(e) => handleChange(index, "name", e.target.value)}
                                                    placeholder="e.g. TaxRate"
                                                />
                                            ) : (
                                                <span className="font-medium">{item.name}</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isEditing ? (
                                                <Input
                                                    value={item.value}
                                                    onChange={(e) => handleChange(index, "value", e.target.value)}
                                                    placeholder="e.g. 18"
                                                />
                                            ) : (
                                                <span>{item.value}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
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
                                                            onClick={() => handleEdit(index)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(index)}
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
