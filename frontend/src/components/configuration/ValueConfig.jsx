import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ValueConfig() {
    const [values, setValues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

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
        setValues([...values, { name: "", value: "" }]);
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

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/config/values", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });
            if (res.ok) {
                setValues(await res.json());
                alert("Saved Successfully!");
            } else {
                alert("Failed to save.");
            }
        } catch (error) {
            console.error("Failed to save", error);
            alert("Error saving values.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Button onClick={handleAdd} size="sm" variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" /> Add Configuration
                </Button>
                <Button onClick={handleSave} size="sm" className="gap-2" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Config Name (Key)</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead className="w-[80px] text-right">Action</TableHead>
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
                            values.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Input
                                            value={item.name}
                                            onChange={(e) => handleChange(index, "name", e.target.value)}
                                            placeholder="e.g. TaxRate"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={item.value}
                                            onChange={(e) => handleChange(index, "value", e.target.value)}
                                            placeholder="e.g. 18"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(index)}
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
