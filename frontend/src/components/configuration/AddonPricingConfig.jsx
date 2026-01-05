import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Edit2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { configurationService } from "@/services/configurationService";

export function AddonPricingConfig() {
    const [photoItems, setPhotoItems] = useState([]);
    const [addonsStart, setAddonsStart] = useState([]);
    const [pricingRules, setPricingRules] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [items, addons, rules] = await Promise.all([
            configurationService.getItems(),
            configurationService.getAddons(),
            configurationService.getPricingRules()
        ]);
        setPhotoItems(items);
        setAddonsStart(addons);
        setPricingRules(rules);
    };

    const savePricingRules = async (newRules) => {
        setPricingRules(newRules); // Optimistic
        await configurationService.savePricingRules(newRules);
        // Refresh rules
        const rules = await configurationService.getPricingRules();
        setPricingRules(rules);
    };

    const [selectedItem, setSelectedItem] = useState("");
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [newPrice, setNewPrice] = useState({ base: "", customer: "" });
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [filterPhotoItem, setFilterPhotoItem] = useState("");

    // Auto-populate prices if a rule exists for the selected combination
    useEffect(() => {
        if (!selectedItem || selectedAddons.length === 0) {
            setNewPrice({ base: "", customer: "" });
            setEditingRuleId(null);
            return;
        }

        // Sort addons to ensure "Frame, Lamination" is treated same as "Lamination, Frame"
        const sortedSelection = [...selectedAddons].sort().join(",");

        const existingRule = pricingRules.find(rule =>
            rule.item === selectedItem &&
            [...rule.addons].sort().join(",") === sortedSelection
        );

        if (existingRule) {
            setNewPrice({ base: existingRule.basePrice, customer: existingRule.customerPrice });
            setEditingRuleId(existingRule.id);
        } else {
            setNewPrice({ base: "", customer: "" });
            setEditingRuleId(null);
        }
    }, [selectedItem, selectedAddons, pricingRules]);

    const handleAddonToggle = (addonName) => {
        if (selectedAddons.includes(addonName)) {
            setSelectedAddons(selectedAddons.filter(a => a !== addonName));
        } else {
            setSelectedAddons([...selectedAddons, addonName]);
        }
    };

    const handleSave = () => {
        if (!selectedItem || selectedAddons.length === 0 || !newPrice.base || !newPrice.customer) return;

        const parsePrice = (val) => {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? 0 : parsed;
        };

        const ruleData = {
            item: selectedItem,
            addons: selectedAddons,
            basePrice: parsePrice(newPrice.base),
            customerPrice: parsePrice(newPrice.customer)
        };

        if (editingRuleId) {
            // Update existing rule
            savePricingRules(pricingRules.map(r => r.id === editingRuleId ? { ...ruleData, id: editingRuleId } : r));
        } else {
            // Add new rule
            savePricingRules([...pricingRules, { ...ruleData, id: Date.now() }]);
        }

        // Reset inputs
        setNewPrice({ base: "", customer: "" });
        setSelectedAddons([]);
        setSelectedItem("");
        setEditingRuleId(null);
    };

    const handleResetForm = () => {
        setSelectedItem("");
        setSelectedAddons([]);
        setNewPrice({ base: "", customer: "" });
        setEditingRuleId(null);
    };

    const handleDelete = (id) => {
        savePricingRules(pricingRules.filter(r => r.id !== id));
        if (editingRuleId === id) {
            handleResetForm();
        }
    };

    const handleEdit = (rule) => {
        setSelectedItem(rule.item);
        setSelectedAddons(rule.addons);
        setNewPrice({ base: rule.basePrice, customer: rule.customerPrice });
        setEditingRuleId(rule.id);
        // Ensure the filter doesn't hide the item being edited
        setFilterPhotoItem(rule.item);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border p-6 rounded-lg bg-card">
                {/* Column 1: Select Photo Item */}
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <Label className="font-semibold">Select Photo Item</Label>
                        <select
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedItem}
                            onChange={(e) => setSelectedItem(e.target.value)}
                            disabled={!!editingRuleId}
                        >
                            <option value="">Select Item</option>
                            {photoItems.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Column 2: Select Addon */}
                <div className="space-y-4 border-l pl-6">
                    <div className="grid gap-2">
                        <Label className="font-semibold">Select Addon</Label>
                        {selectedItem ? (
                            <div className="space-y-2 max-h-[250px] overflow-y-auto pt-1">
                                {addonsStart.map(addon => (
                                    <label key={addon.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-secondary/50 p-1 rounded transition-colors">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary disabled:opacity-50"
                                            checked={selectedAddons.includes(addon.name)}
                                            onChange={() => handleAddonToggle(addon.name)}
                                            disabled={!!editingRuleId}
                                        />
                                        <span>{addon.name}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic pt-1">Select a photo item first.</p>
                        )}
                    </div>
                </div>

                {/* Column 3: Set Pricing */}
                <div className="space-y-4 border-l pl-6">
                    <Label className="font-semibold block">Set Pricing</Label>

                    {selectedItem ? (
                        <div className="space-y-4">
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">Base Price</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    onWheel={(e) => e.target.blur()}
                                    value={newPrice.base}
                                    onChange={(e) => setNewPrice({ ...newPrice, base: e.target.value })}
                                    placeholder="Enter Base Price"
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label className="text-xs font-medium text-muted-foreground">Customer Price</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    onWheel={(e) => e.target.blur()}
                                    value={newPrice.customer}
                                    onChange={(e) => setNewPrice({ ...newPrice, customer: e.target.value })}
                                    placeholder="Enter custom price"
                                />
                            </div>

                            <div className="pt-2 flex gap-2">
                                <Button onClick={handleSave} className="flex-1">
                                    {editingRuleId ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                    {editingRuleId ? "Update Combination" : "Add Combination"}
                                </Button>
                                {(editingRuleId || selectedItem) && (
                                    <Button onClick={handleResetForm} variant="outline" className="px-3" title="Clear / Cancel">
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic pt-1">Select a photo item first.</p>
                    )}
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden space-y-4 p-4">
                <div className="flex items-center gap-2 max-w-sm">
                    <Label>Filter by Item:</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={filterPhotoItem}
                        onChange={(e) => setFilterPhotoItem(e.target.value)}
                    >
                        <option value="">All Items</option>
                        {photoItems.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                    </select>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="py-2">Photo Item</TableHead>
                            <TableHead className="py-2">Addons</TableHead>
                            <TableHead className="text-right py-2">Base Price</TableHead>
                            <TableHead className="text-right py-2">Customer Price</TableHead>
                            <TableHead className="text-right w-[100px] py-2">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pricingRules
                            .filter(rule => !filterPhotoItem || rule.item === filterPhotoItem)
                            .map((rule) => (
                                <TableRow key={rule.id} className={editingRuleId === rule.id ? "bg-muted/50" : ""}>
                                    <TableCell className="font-medium py-2">{rule.item}</TableCell>
                                    <TableCell className="py-2">
                                        <div className="flex gap-1 flex-wrap">
                                            {rule.addons.map(a => (
                                                <span key={a} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                    {a}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right py-2">{rule.basePrice}</TableCell>
                                    <TableCell className="text-right py-2">{rule.customerPrice}</TableCell>
                                    <TableCell className="py-2 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 mr-1" onClick={() => handleEdit(rule)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(rule.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        {pricingRules.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                    No pricing rules configured.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
