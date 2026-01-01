import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CustomerInfo } from "./CustomerInfo";
import { PaymentMode } from "./PaymentMode";
import { FileUpload } from "./FileUpload";
import { PhotoItemForm } from "./PhotoItemForm";
import { configurationService } from "@/services/configurationService";
import { customerService } from "@/services/customerService";


export function PhotoOrderModal({ isOpen, onClose, onSave, instanceId, editOrder }) {
    const [customer, setCustomer] = useState({ mobile: '', name: '', id: '' });
    const [items, setItems] = useState([]);
    const [description, setDescription] = useState("");
    const [payment, setPayment] = useState({ mode: 'Cash', total: 0, discount: 0, advance: 0 });
    const [image, setImage] = useState(null);
    const [configItems, setConfigItems] = useState([]);

    useEffect(() => {
        configurationService.getItems().then(data => setConfigItems(data || []));
    }, []);

    useEffect(() => {
        if (editOrder) {
            // Populate form for editing
            setCustomer({
                name: editOrder.customer?.name || '',
                mobile: editOrder.customer?.mobile || '',
                id: editOrder.customer?.id || ''
            });

            try {
                setItems(JSON.parse(editOrder.itemsJson || '[]'));
            } catch (e) { setItems([]); }

            setPayment({
                mode: editOrder.payment?.paymentMode || 'Cash',
                total: editOrder.payment?.totalAmount || 0,
                discount: editOrder.payment?.discountAmount || 0,
                discount: editOrder.payment?.discountAmount || 0,
                advance: editOrder.payment?.advanceAmount || 0
            });

            // Set existing image/uploadId for preview
            setImage(editOrder.uploadId || editOrder.image || null);

            setDescription(editOrder.description || "");
        }
    }, [editOrder]);

    // Auto-calculate total from items (Only if NOT loading existing? Or always?
    // If I edit items, it should recalc.
    // Issue: If I load existing, this effect might run and overwrite values?
    // items state changes -> effect runs -> updates payment.
    // If setPayment sets initial, then setItems sets items, effect runs.
    // If parsedItems match calculated total, it's fine.
    // But if there was a discrepancy, it might auto-correct. Which is usually good.
    useEffect(() => {
        const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);

        const totalBasePrice = items.reduce((sum, item) => {
            let bp = parseFloat(item.basePrice);
            if (isNaN(bp) && configItems.length > 0) {
                const cfg = configItems.find(c => c.name === item.type);
                if (cfg) {
                    bp = item.isInstant ? parseFloat(cfg.instantCustomerPrice) : parseFloat(cfg.regularCustomerPrice);
                }
            }
            return sum + ((bp || 0) * item.quantity);
        }, 0);

        setPayment(prev => {
            if (prev.total === totalAmount) return prev;
            return { ...prev, total: totalAmount };
        });
    }, [items, configItems]);

    const handleSearchCustomer = async () => {
        console.log("handleSearchCustomer Triggered. Mobile:", customer.mobile);
        if (!customer.mobile) return;

        // Allow 9 digits (Generated ID) or 10 digits (Mobile)
        if (!/^\d{9,10}$/.test(customer.mobile)) {
            alert("Please enter a valid Mobile Number (10 digits) or Customer ID (9 digits).");
            return;
        }

        try {
            const found = await customerService.search(customer.mobile);
            if (found) {
                setCustomer(prev => ({
                    ...prev,
                    name: found.name || '',
                    id: found.id || prev.mobile
                }));
            }
        } catch (error) {
            // Not found (New Customer) -> Do nothing
        }
    }

    const handleSave = () => {
        if (!items || items.length === 0) {
            alert("Please add at least one item to save the order.");
            return;
        }

        // If Mobile is NOT provided, Name is Mandatory
        if (!customer.mobile && !customer.name.trim()) {
            alert("Customer Name is mandatory when Mobile Number is not provided.");
            return;
        }

        if (!customer.mobile && !editOrder && !customer.id) {
            // Basic mobile check? 
        }

        // --- BUCKETING LOGIC ---
        // 1. Group by Manual Group ID (if user used Drag & Drop)
        const groups = {};
        items.forEach(item => {
            const gId = item.groupId || 1;
            if (!groups[gId]) groups[gId] = [];
            groups[gId].push(item);
        });

        const manualGroupIds = Object.keys(groups);

        const buckets = [];

        if (manualGroupIds.length > 1) {
            // User manually grouped items -> Honor that structure exactly
            manualGroupIds.sort().forEach(gId => {
                buckets.push({
                    label: gId === '1' ? "Main Order" : `Split Order #${gId}`,
                    items: groups[gId],
                    type: "manual"
                });
            });
        } else {
            // No manual groups -> Apply Default Auto-Split (Instant vs Regular)
            const instantItems = items.filter(i => i.isInstant);
            const regularItems = items.filter(i => !i.isInstant);

            if (instantItems.length > 0) buckets.push({ label: "Instant", items: instantItems, type: "instant" });
            if (regularItems.length > 0) buckets.push({ label: "Regular", items: regularItems, type: "regular" });
        }

        // --- SPLIT LOGIC ---
        if (buckets.length > 1 && !editOrder) {
            const calculateTotal = (itemList) => itemList.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
            const grandTotal = calculateTotal(items);
            const totalDiscount = parseFloat(payment.discount) || 0;
            const totalAdvance = parseFloat(payment.advance) || 0;

            let distributedDiscount = 0;
            let distributedAdvance = 0;

            const splitOrders = buckets.map((bucket, index) => {
                const bucketTotal = calculateTotal(bucket.items);
                const isLast = index === buckets.length - 1;

                // Proportional Discount
                const bucketDiscount = isLast
                    ? totalDiscount - distributedDiscount
                    : Math.round((bucketTotal / grandTotal) * totalDiscount);

                distributedDiscount += bucketDiscount;

                // Pay Priority: Instant > Regular > Extra
                // OR Proportional? Using Proportional for fairness unless user specified.
                // Existing code used Priority for Instant. Let's stick to Proportional for now to be safe with 3 buckets.
                // Actually, "Extras" are usually paid later? No, let's do proportional.
                const bucketAdvance = isLast
                    ? totalAdvance - distributedAdvance
                    : Math.round((bucketTotal / grandTotal) * totalAdvance);

                distributedAdvance += bucketAdvance;

                return {
                    customer,
                    items: bucket.items,
                    description: description ? `[${bucket.label.toUpperCase()}] ${description}` : "",
                    payment: {
                        mode: payment.mode,
                        total: bucketTotal,
                        discount: bucketDiscount,
                        advance: bucketAdvance
                    },
                    image: (image && image instanceof File) ? image.name : image,
                    status: 'Pending'
                };
            });

            onSave(splitOrders);

        } else {
            // --- NORMAL LOGIC (Single Order) ---
            const newOrder = {
                orderId: editOrder?.orderId,
                customer,
                items,
                description,
                payment,
                image: (image && image instanceof File) ? image.name : image
            };
            onSave(newOrder);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Photo Order" className="max-w-4xl h-[90vh] flex flex-col p-0" noBodyPadding={true}>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <CustomerInfo
                            customer={customer}
                            setCustomer={setCustomer}
                            onSearch={handleSearchCustomer}
                            instanceId={instanceId}
                            disabled={!!editOrder}
                        />
                        <FileUpload
                            file={image}
                            onUpload={setImage}
                            onRemove={() => setImage(null)}
                            source="Photo Order"
                        />
                        <div className="grid gap-2">
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

                    {/* Right Column */}
                    <div className="space-y-6">
                        <PhotoItemForm
                            items={items}
                            setItems={setItems}
                        />
                        <PaymentMode
                            payment={payment}
                            setPayment={setPayment}
                            minAdvance={items.reduce((sum, item) => sum + ((parseFloat(item.basePrice) || 0) * item.quantity), 0)}
                        />
                    </div>
                </div>
            </div>

            <div className="border-t p-4 flex justify-end gap-2 bg-muted/50 rounded-b-lg">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave}>Save Order</Button>
            </div>
        </Modal>
    );
}
