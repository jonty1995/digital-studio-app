import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { configurationService } from "@/services/configurationService";

export function AddonConfig() {
    const [addons, setAddons] = useState([]);
    const [newItem, setNewItem] = useState("");
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        loadAddons();
    }, []);

    const loadAddons = async () => {
        const data = await configurationService.getAddons();
        setAddons(data);
    };

    const saveAddons = async (newAddons) => {
        setAddons(newAddons);
        await configurationService.saveAddons(newAddons);
        loadAddons();
    };

    const handleSave = () => {
        if (!newItem) return;

        if (editingId) {
            saveAddons(addons.map(item => item.id === editingId ? { ...item, name: newItem } : item));
            setEditingId(null);
        } else {
            saveAddons([...addons, { id: Date.now(), name: newItem }]);
        }
        setNewItem("");
    };

    const handleEdit = (item) => {
        setNewItem(item.name);
        setEditingId(item.id);
    };

    const handleCancelEdit = () => {
        setNewItem("");
        setEditingId(null);
    };

    const handleDelete = (id) => {
        saveAddons(addons.filter(i => i.id !== id));
        if (editingId === id) handleCancelEdit();
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-end border p-4 rounded-lg bg-card max-w-lg">
                <div className="flex-1">
                    <label className="text-sm font-medium">Addon Name</label>
                    <Input
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        placeholder="e.g. Frame"
                    />
                </div>
                <div className="flex gap-2">
                    {editingId && (
                        <Button onClick={handleCancelEdit} variant="outline" size="icon">
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                    <Button onClick={handleSave}>
                        {editingId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        {editingId ? "Update" : "Add Addon"}
                    </Button>
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden max-w-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="py-2 h-10">Addon Name</TableHead>
                            <TableHead className="text-right w-[100px] py-2 h-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {addons.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium py-2">{item.name}</TableCell>
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
                        {addons.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                                    No addons configured.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
