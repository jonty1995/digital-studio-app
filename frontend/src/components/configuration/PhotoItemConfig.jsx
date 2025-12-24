import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { configurationService } from "@/services/configurationService";

export function PhotoItemConfig() {
    // Mock data for now
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState({ name: "", regularBase: "", regularCustomer: "", instantBase: "", instantCustomer: "" });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        const data = await configurationService.getItems();
        setItems(data);
    };

    const saveItems = async (newItems) => {
        setItems(newItems); // Optimistic update
        await configurationService.saveItems(newItems);
        loadItems(); // Refresh to get DB IDs
    }

    const handleSave = () => {
        if (!newItem.name) return;

        // Validation: Unique Name
        const nameExists = items.some(item =>
            item.name.toLowerCase() === newItem.name.toLowerCase() && item.id !== editingId
        );
        if (nameExists) {
            alert("Item name must be unique.");
            return;
        }

        const parsePrice = (val) => {
            const parsed = parseInt(val, 10);
            return isNaN(parsed) ? 0 : parsed;
        };

        const itemData = {
            name: newItem.name,
            regularBase: parsePrice(newItem.regularBase),
            regularCustomer: parsePrice(newItem.regularCustomer),
            instantBase: parsePrice(newItem.instantBase),
            instantCustomer: parsePrice(newItem.instantCustomer)
        };

        if (editingId) {
            saveItems(items.map(item => item.id === editingId ? { ...itemData, id: editingId } : item));
            setEditingId(null);
        } else {
            saveItems([...items, { ...itemData, id: Date.now() }]);
        }

        setNewItem({ name: "", regularBase: "", regularCustomer: "", instantBase: "", instantCustomer: "" });
    };

    const handleEdit = (item) => {
        setNewItem({
            name: item.name,
            regularBase: item.regularBase,
            regularCustomer: item.regularCustomer,
            instantBase: item.instantBase,
            instantCustomer: item.instantCustomer
        });
        setEditingId(item.id);
    };

    const handleCancelEdit = () => {
        setNewItem({ name: "", regularBase: "", regularCustomer: "", instantBase: "", instantCustomer: "" });
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
                        value={newItem.regularBase}
                        onChange={(e) => setNewItem({ ...newItem, regularBase: e.target.value })}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Regular Customer Price</label>
                    <Input
                        type="number"
                        step="1"
                        value={newItem.regularCustomer}
                        onChange={(e) => setNewItem({ ...newItem, regularCustomer: e.target.value })}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Instant Base Price</label>
                    <Input
                        type="number"
                        step="1"
                        value={newItem.instantBase}
                        onChange={(e) => setNewItem({ ...newItem, instantBase: e.target.value })}
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground">Instant Customer Price</label>
                    <Input
                        type="number"
                        step="1"
                        value={newItem.instantCustomer}
                        onChange={(e) => setNewItem({ ...newItem, instantCustomer: e.target.value })}
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
                                <TableCell className="text-right py-2">{item.regularBase}</TableCell>
                                <TableCell className="text-right py-2">{item.regularCustomer}</TableCell>
                                <TableCell className="text-right py-2">{item.instantBase}</TableCell>
                                <TableCell className="text-right py-2">{item.instantCustomer}</TableCell>
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
        </div>
    );
}
