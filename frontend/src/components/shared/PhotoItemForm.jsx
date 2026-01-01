import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Trash2, Plus, ChevronDown } from "lucide-react"
import { configurationService } from "@/services/configurationService"

export function PhotoItemForm({ items, setItems }) {
    const [availableItems, setAvailableItems] = useState([]);
    const [availableAddons, setAvailableAddons] = useState([]);
    const [pricingRules, setPricingRules] = useState([]);
    const [expandedItem, setExpandedItem] = useState(null);

    const [newItem, setNewItem] = useState({
        type: "",
        addons: [],
        quantity: 1,
        isInstant: false,
        isSeparate: false,
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
            ? (newItem.isInstant ? (parseFloat(configItem.instantBasePrice) || 0) : (parseFloat(configItem.regularBasePrice) || 0))
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
            isSeparate: false,
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

    // --- DRAG AND DROP GROUPING LOGIC ---
    const [groups, setGroups] = useState([1]); // IDs of active groups
    const [draggedItemIndex, setDraggedItemIndex] = useState(null);
    const [draggedAddon, setDraggedAddon] = useState(null); // { parentIndex, name }

    const handleDragStart = (e, index, addonName = null) => {
        if (addonName) {
            setDraggedAddon({ parentIndex: index, name: addonName });
            setDraggedItemIndex(null);
            // Prevent the parent item row from being dragged instead
            e.stopPropagation();
        } else {
            setDraggedItemIndex(index);
            setDraggedAddon(null);
        }
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary for onDrop to fire
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e, targetGroupId) => {
        e.preventDefault();

        const updatedItems = [...items];

        // Case A: Moving Whole Item
        if (draggedItemIndex !== null) {
            updatedItems[draggedItemIndex] = { ...updatedItems[draggedItemIndex], groupId: targetGroupId };
            setItems(updatedItems);
            setDraggedItemIndex(null);
            return;
        }

        // Case B: Detaching Addon -> New Item
        if (draggedAddon) {
            const { parentIndex, name } = draggedAddon;
            const sourceItem = updatedItems[parentIndex];
            if (!sourceItem) return;

            // 1. Remove Addon from Source
            const newAddons = sourceItem.addons.filter(a => a !== name);
            const updatedSource = { ...sourceItem, addons: newAddons };

            // Recalculate Source Price
            const srcConfig = availableItems.find(i => i.name === updatedSource.type);
            const srcBase = srcConfig
                ? (updatedSource.isInstant ? (parseFloat(srcConfig.instantCustomerPrice) || 0) : (parseFloat(srcConfig.regularCustomerPrice) || 0))
                : 0;
            const srcUnit = configurationService.calculatePrice(updatedSource.type, newAddons, updatedSource.isInstant, true, availableItems, pricingRules);

            // Calculate Addon Contribution (Price Delta)
            const prevUnit = configurationService.calculatePrice(sourceItem.type, sourceItem.addons, sourceItem.isInstant, true, availableItems, pricingRules);
            const addonContribution = prevUnit - srcUnit;

            updatedSource.unitPrice = srcUnit;
            updatedSource.basePrice = srcBase;
            updatedSource.price = srcUnit * updatedSource.quantity;

            updatedItems[parentIndex] = updatedSource;

            // 2. Create New Item for Addon
            // Use Addon Contribution to preserve Total Price
            let newAddonItem = {
                type: name,
                addons: [],
                quantity: sourceItem.quantity,
                isInstant: sourceItem.isInstant,
                groupId: targetGroupId,
                sourceLabel: sourceItem.type, // Track where this addon came from
                price: 0,
                unitPrice: 0,
                basePrice: 0
            };

            const newUnit = addonContribution;
            const newBase = addonContribution;

            newAddonItem.unitPrice = newUnit;
            newAddonItem.basePrice = newBase;
            newAddonItem.price = newUnit * newAddonItem.quantity;

            updatedItems.push(newAddonItem);

            setItems(updatedItems);
            setDraggedAddon(null);
        }
    };

    const addGroup = () => {
        const nextId = Math.max(...groups) + 1;
        setGroups([...groups, nextId]);
    };

    // Clean up empty groups (optional, maybe on save?) 
    // For now, let's keep them explicit so user can drag back and forth.

    // Group items for rendering
    const groupedItems = groups.map(gId => ({
        id: gId,
        items: items.filter(i => (i.groupId || 1) === gId) // Default to 1 if missing
    }));

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
                            onWheel={(e) => e.target.blur()}
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
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-purple-900 uppercase text-sm tracking-wide">Selected Photo Items</h3>
                    <Button onClick={addGroup} size="sm" variant="outline" className="h-7 text-xs border-purple-200 text-purple-700 hover:bg-purple-100">
                        <Plus className="h-3 w-3 mr-1" /> New Order Group
                    </Button>
                </div>

                {groupedItems.map(group => (
                    <div
                        key={group.id}
                        className={`rounded-lg border-2 border-dashed transition-colors p-4 space-y-2 ${group.id === 1 ? 'border-purple-200 bg-purple-50/30' : 'border-amber-200 bg-amber-50/30'}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, group.id)}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-bold uppercase tracking-wider ${group.id === 1 ? 'text-purple-700' : 'text-amber-700'}`}>
                                {group.id === 1 ? "Main Order" : `Split Order #${group.id}`}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                                Total: ₹{group.items.reduce((s, i) => s + i.price, 0).toFixed(2)}
                            </span>
                        </div>

                        {group.items.length === 0 ? (
                            <div className="text-center py-4 text-gray-400 italic text-xs">
                                Drag items here to split order
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {group.items.map((item) => {
                                    const originalIndex = items.indexOf(item);

                                    // Calculate base price for breakdown display
                                    const configItem = availableItems.find(i => i.name === item.type);
                                    let baseItemPrice = 0;

                                    if (item.sourceLabel) {
                                        baseItemPrice = item.unitPrice;
                                    } else {
                                        baseItemPrice = configItem
                                            ? (item.isInstant ? (parseFloat(configItem.instantCustomerPrice) || 0) : (parseFloat(configItem.regularCustomerPrice) || 0))
                                            : 0;
                                    }
                                    const addonsTotal = item.unitPrice - baseItemPrice;
                                    const isExpanded = expandedItem === originalIndex;

                                    return (
                                        <div
                                            key={originalIndex}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, originalIndex)}
                                            className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden transition-all cursor-move hover:shadow-md"
                                        >
                                            <div
                                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                                                onClick={() => setExpandedItem(isExpanded ? null : originalIndex)}
                                            >
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                                    </div>
                                                    <span className="font-semibold text-gray-900 flex items-center flex-wrap">
                                                        {item.type}
                                                        {item.sourceLabel && (
                                                            <span className="ml-2 bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded border border-indigo-100 font-medium whitespace-nowrap flex items-center">
                                                                {item.sourceLabel}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="text-gray-400 text-xs">x</span>
                                                    <span className="font-medium text-gray-800">{item.quantity}</span>

                                                    {item.isInstant && (
                                                        <span className="bg-red-100 text-red-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-red-200">
                                                            Instant
                                                        </span>
                                                    )}

                                                    {item.addons.length > 0 && (
                                                        <div className="flex gap-1 ml-2">
                                                            {item.addons.map(a => (
                                                                <span
                                                                    key={a}
                                                                    draggable
                                                                    onDragStart={(e) => handleDragStart(e, originalIndex, a)}
                                                                    className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded border border-gray-200 cursor-grab hover:bg-gray-200 hover:shadow-sm"
                                                                    title="Drag to detach into separate order"
                                                                >
                                                                    {a}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-gray-900">₹{item.price.toFixed(2)}</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeItem(originalIndex); }}
                                                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded Cost Breakup */}
                                            {isExpanded && (
                                                <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 text-sm text-gray-700 space-y-1">
                                                    <div className="flex justify-between items-center text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">
                                                        Cost Breakup (Per Unit)
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span>{item.sourceLabel ? "Addon Price" : `Base Price (${item.type})`}</span>
                                                        <span>₹{baseItemPrice.toFixed(2)}</span>
                                                    </div>
                                                    {item.addons.length > 0 && (
                                                        <div className="flex justify-between items-center">
                                                            <span>Addons ({item.addons.join(", ")})</span>
                                                            <span>₹{addonsTotal.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center border-t border-gray-200 pt-1 mt-1 font-medium">
                                                        <span>Unit Price</span>
                                                        <span>₹{item.unitPrice.toFixed(2)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center font-bold text-gray-900 pt-1">
                                                        <span>Total ({item.quantity} qty)</span>
                                                        <span>₹{item.price.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

        </div>
    );
}
