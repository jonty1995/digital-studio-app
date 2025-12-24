import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"

export function PhotoItemForm({ items, setItems, description, setDescription }) {

    const addItem = () => {
        setItems([...items, { type: "", quantity: 1, price: 0 }])
    }

    const updateItem = (index, field, value) => {
        const newItems = [...items]
        newItems[index][field] = value
        setItems(newItems)
    }

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index))
    }

    // Mock item types for now
    const itemTypes = ["Passport Size", "4x6", "5x7", "8x10", "Frame A4", "Mug Print"]

    return (
        <div className="space-y-4 rounded-md border p-4 bg-card">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">Photo Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
            </div>

            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-6">
                            <Label className="text-xs">Type</Label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={item.type}
                                onChange={(e) => updateItem(index, 'type', e.target.value)}
                            >
                                <option value="">Select Item</option>
                                {itemTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs">Qty</Label>
                            <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="col-span-3">
                            <Label className="text-xs">Price</Label>
                            <Input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="col-span-1">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </div>
                ))}
                {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No items added.</p>}
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                    id="description"
                    placeholder="Add special instructions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>
        </div>
    )
}
