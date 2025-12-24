import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, ChevronDown } from "lucide-react"
import { configurationService } from "@/services/configurationService"

export function PhotoItemForm({ items, setItems, description, setDescription }) {
    const [availableItems, setAvailableItems] = useState([]);
    const [availableAddons, setAvailableAddons] = useState([]);
    const [pricingRules, setPricingRules] = useState([]);
    const [expandedItem, setExpandedItem] = useState(null);

    const [newItem, setNewItem] = useState({
        type: "",
        addons: [],
        quantity: 1,
        isInstant: false,
        price: 0,
        unitPrice: 0
    });

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

    // Recalculate price when newItem changes
    // Recalculate price when newItem changes
    useEffect(() => {
        if (!newItem.type) return;

        const unitPrice = configurationService.calculatePrice(
            newItem.type,
            newItem.addons,
            newItem.isInstant,
            true, // isCustomer
            availableItems,
            pricingRules
        );

        // Calculate Base Price Unit
        const configItem = availableItems.find(i => i.name === newItem.type);
        const basePrice = configItem
            ? (newItem.isInstant ? (parseFloat(configItem.instantCustomerPrice) || 0) : (parseFloat(configItem.regularCustomerPrice) || 0))
            : 0;

        setNewItem(prev => ({
            ...prev,
            unitPrice: unitPrice,
            basePrice: basePrice,
            price: unitPrice * prev.quantity
        }));
    }, [newItem.type, newItem.addons, newItem.isInstant, newItem.quantity, availableItems, pricingRules]);

    const handleAddItem = () => {
        if (!newItem.type) return;
        setItems([...items, { ...newItem }]);
        setNewItem({
            type: "",
            addons: [],
            quantity: 1,
            isInstant: false,
            price: 0,
            unitPrice: 0,
            basePrice: 0
        });
    };

    const toggleNewItemAddon = (addonName) => {
        const currentAddons = newItem.addons;
        let newAddons;
        if (currentAddons.includes(addonName)) {
            newAddons = currentAddons.filter(a => a !== addonName);
        } else {
            newAddons = [...currentAddons, addonName];
        }
        setNewItem({ ...newItem, addons: newAddons });
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-6 bg-card">
            {/* ADD PHOTO ITEMS SECTION (Green) */}
            <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 space-y-4">
                <h3 className="font-bold text-green-900 uppercase text-sm tracking-wide">Add Photo Items</h3>
                <div className="space-y-1">
                    <Label className="text-green-900 font-medium text-xs">Select Photo Item & Quantity</Label>
                    <div className="flex gap-2 items-start">
                        <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-green-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={newItem.type}
                            onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                        >
                            <option value="">Select Photo Item</option>
                            {(availableItems || []).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                        <Input
                            type="number"
                            min="1"
                            className="w-20 bg-white border-green-200 focus-visible:ring-green-500"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                        />
                        <label className={`flex items-center gap-2 px-3 h-10 border rounded-md cursor-pointer transition-colors ${newItem.isInstant ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-green-200 text-gray-700 hover:bg-gray-50'}`}>
                            <input
                                type="checkbox"
                                checked={newItem.isInstant}
                                onChange={(e) => setNewItem({ ...newItem, isInstant: e.target.checked })}
                                className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                            />
                            <span className="font-medium text-sm">Instant</span>
                        </label>
                    </div>
                </div>

                {/* Addons Selection (Dynamic) */}
                {newItem.type && (
                    <div className="pt-1">
                        <Label className="text-green-800 text-xs mb-1 block">Addons</Label>
                        <div className="flex flex-wrap gap-2">
                            {(availableAddons || [])
                                .filter(addon => {
                                    const itemRules = pricingRules.filter(r => r.item === newItem.type);
                                    const allowedAddons = new Set(itemRules.flatMap(r => r.addons));
                                    return allowedAddons.has(addon.name);
                                })
                                .map(addon => (
                                    <label key={addon.id} className="flex items-center space-x-1 text-xs cursor-pointer bg-white border border-green-100 px-2 py-1 rounded-md text-green-800 shadow-sm hover:bg-green-100">
                                        <input
                                            type="checkbox"
                                            checked={newItem.addons.includes(addon.name)}
                                            onChange={() => toggleNewItemAddon(addon.name)}
                                            className="rounded border-green-300 text-green-600 focus:ring-green-500 h-3 w-3"
                                        />
                                        <span>{addon.name}</span>
                                    </label>
                                ))}
                            {availableAddons.filter(addon => {
                                const itemRules = pricingRules.filter(r => r.item === newItem.type);
                                const allowedAddons = new Set(itemRules.flatMap(r => r.addons));
                                return allowedAddons.has(addon.name);
                            }).length === 0 && (
                                    <span className="text-xs text-green-600/70 italic">No addons options.</span>
                                )}
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <Button
                        onClick={handleAddItem}
                        disabled={!newItem.type}
                        className="bg-green-600 hover:bg-green-700 text-white min-w-[100px]"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Add
                    </Button>
                </div>
            </div>

            {/* SELECTED PHOTO ITEMS SECTION (Purple) */}
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 space-y-4">
                <h3 className="font-bold text-purple-900 uppercase text-sm tracking-wide">Selected Photo Items</h3>

                <div className="space-y-2">
                    {items.map((item, index) => {
                        // Calculate base price for breakdown display
                        const configItem = availableItems.find(i => i.name === item.type);
                        const baseItemPrice = configItem
                            ? (item.isInstant ? (parseFloat(configItem.instantCustomerPrice) || 0) : (parseFloat(configItem.regularCustomerPrice) || 0))
                            : 0;
                        const addonsTotal = item.unitPrice - baseItemPrice;
                        const isExpanded = expandedItem === index;

                        return (
                            <div key={index} className="bg-white border border-purple-100 rounded-md shadow-sm overflow-hidden transition-all">
                                <div
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-purple-50/30"
                                    onClick={() => setExpandedItem(isExpanded ? null : index)}
                                >
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                            <ChevronDown className="h-4 w-4 text-purple-400" />
                                        </div>
                                        <span className="font-semibold text-purple-900">{item.type}</span>
                                        <span className="text-purple-400 text-xs">x</span>
                                        <span className="font-medium text-purple-800">{item.quantity}</span>

                                        {item.isInstant && (
                                            <span className="bg-red-100 text-red-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-red-200">
                                                Instant
                                            </span>
                                        )}

                                        {item.addons.length > 0 && (
                                            <div className="flex gap-1 ml-2">
                                                {item.addons.map(a => (
                                                    <span key={a} className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded">
                                                        {a}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <span className="font-bold text-purple-900">₹{item.price.toFixed(2)}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeItem(index); }}
                                            className="text-purple-300 hover:text-purple-600 transition-colors p-1"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Cost Breakup */}
                                {isExpanded && (
                                    <div className="bg-purple-50/30 border-t border-purple-100 px-4 py-3 text-sm text-purple-800 space-y-1">
                                        <div className="flex justify-between items-center text-xs text-purple-600 uppercase tracking-wider font-semibold mb-2">
                                            Cost Breakup (Per Unit)
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Base Price ({item.type})</span>
                                            <span>₹{baseItemPrice.toFixed(2)}</span>
                                        </div>
                                        {item.addons.length > 0 && (
                                            <div className="flex justify-between items-center">
                                                <span>Addons ({item.addons.join(", ")})</span>
                                                <span>₹{addonsTotal.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center border-t border-purple-200 pt-1 mt-1 font-medium">
                                            <span>Unit Price</span>
                                            <span>₹{item.unitPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center font-bold text-purple-900 pt-1">
                                            <span>Total ({item.quantity} qty)</span>
                                            <span>₹{item.price.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {items.length === 0 && (
                        <div className="text-center py-6 text-purple-300 italic text-sm border-2 border-dashed border-purple-100 rounded-md">
                            No items added to order yet.
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-2 pt-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                    id="description"
                    placeholder="Add special instructions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[80px]"
                />
            </div>
        </div>
    );
}
