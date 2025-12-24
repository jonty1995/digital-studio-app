import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trash2, Plus } from "lucide-react"
import { configurationService } from "@/services/configurationService"

export function PhotoItemForm({ items, setItems, description, setDescription }) {
    const [availableItems, setAvailableItems] = useState([]);
    const [availableAddons, setAvailableAddons] = useState([]);
    const [pricingRules, setPricingRules] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            const [itemsData, addonsData, rulesData] = await Promise.all([
                configurationService.getItems(),
                configurationService.getAddons(),
                configurationService.getPricingRules()
            ]);
            setAvailableItems(itemsData || []);
            setAvailableAddons(addonsData || []);
            setPricingRules(rulesData || []);
        };
        loadData();
    }, []);

    const addItem = () => {
        setItems([...items, { type: "", addons: [], quantity: 1, price: 0 }])
    }

    const updateItem = (index, field, value) => {
        const newItems = [...items]
        newItems[index][field] = value

        // Recalculate price if type or addons change
        if (field === 'type' || field === 'addons') {
            const itemType = field === 'type' ? value : newItems[index].type;
            const itemAddons = field === 'addons' ? value : newItems[index].addons;

            // Assuming regular customer price for now (default)
            const unitPrice = configurationService.calculatePrice(
                itemType,
                itemAddons,
                false,
                true,
                availableItems,
                pricingRules
            );
            newItems[index].price = unitPrice * newItems[index].quantity;
            newItems[index].unitPrice = unitPrice; // Store unit price for quantity updates
        } else if (field === 'quantity') {
            // Update price based on unit price
            if (newItems[index].unitPrice) {
                newItems[index].price = newItems[index].unitPrice * value;
            }
        }

        setItems(newItems)
    }

    const toggleAddon = (index, addonName) => {
        const currentAddons = items[index].addons || [];
        let newAddons;
        if (currentAddons.includes(addonName)) {
            newAddons = currentAddons.filter(a => a !== addonName);
        } else {
            newAddons = [...currentAddons, addonName];
        }
        updateItem(index, 'addons', newAddons);
    }

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-4 rounded-md border p-4 bg-card">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold">Photo Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
            </div>

            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start border-b pb-4 last:border-0">
                        <div className="md:col-span-4 space-y-2">
                            <Label className="text-xs">Type</Label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={item.type}
                                onChange={(e) => updateItem(index, 'type', e.target.value)}
                            >
                                <option value="">Select Item</option>
                                {(availableItems || []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                            </select>

                            {/* Addons Selection */}
                            <div className="pt-2">
                                <Label className="text-xs mb-1 block">Addons</Label>
                                <div className="flex flex-wrap gap-2">
                                    {availableAddons.map(addon => (
                                        <label key={addon.id} className="flex items-center space-x-1 text-xs cursor-pointer bg-secondary px-2 py-1 rounded-md">
                                            <input
                                                type="checkbox"
                                                checked={(item.addons || []).includes(addon.name)}
                                                onChange={() => toggleAddon(index, addon.name)}
                                                className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                            />
                                            <span>{addon.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <Label className="text-xs">Qty</Label>
                            <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            />
                        </div>
                        <div className="md:col-span-3">
                            <Label className="text-xs">Total Price</Label>
                            <Input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="md:col-span-1 pt-6 text-right md:text-left">
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
