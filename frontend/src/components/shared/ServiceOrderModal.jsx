import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomerInfo } from "./CustomerInfo";
import { PaymentMode } from "./PaymentMode";
import { customerService } from "@/services/customerService";
import { configurationService } from "@/services/configurationService";
import { fileService } from "@/services/fileService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { FileUpload } from "./FileUpload";

export function ServiceOrderModal({ isOpen, onClose, onSave, order = null }) {
    // Customer State
    const [customer, setCustomer] = useState({ mobile: '', name: '', id: '' });

    // Details State
    const [details, setDetails] = useState({
        serviceName: "",
        amount: "",
        description: "",
        quantity: 1, // Default quantity
        isCustom: false // Track if custom service
    });
    const [saveAsNew, setSaveAsNew] = useState(true);

    // Payment State
    const [payment, setPayment] = useState({ mode: 'Cash', total: 0, discount: 0, advance: 0 });
    const [documentIds, setDocumentIds] = useState([]); // Array of file IDs or File objects
    const [serviceItems, setServiceItems] = useState([]);
    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadServiceItems();
    }, []);

    const loadServiceItems = async () => {
        const items = await configurationService.getServiceItems();
        setServiceItems(items);
    };

    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    useEffect(() => {
        if (!isOpen) {
            setCustomer({ mobile: '', name: '', id: '' });
            setDetails({
                serviceName: "",
                amount: "",
                description: "",
                quantity: 1,
                isCustom: false
            });
            setSaveAsNew(true);
            setPayment({ mode: 'Cash', total: 0, discount: 0, advance: 0 });
            setDocumentIds([]);
        } else if (order) {
            // Edit Mode
            setCustomer({
                mobile: order.customer?.mobile || '',
                name: order.customer?.name || '',
                id: order.customer?.id || ''
            });
            setDetails({
                serviceName: order.serviceName || '',
                amount: order.amount?.toString() || '',
                description: order.description || '',
                quantity: order.quantity || 1,
                isCustom: false // Assuming edit of existing means it's already set
            });

            if (order.payment) {
                setPayment({
                    mode: order.payment.paymentMode || 'Cash',
                    total: order.payment.totalAmount || 0,
                    discount: order.payment.discountAmount || 0,
                    advance: order.payment.amountPaid || 0
                });
            }

            if (order.uploadIdsJson) {
                try {
                    setDocumentIds(JSON.parse(order.uploadIdsJson));
                } catch (e) {
                    setDocumentIds([]);
                }
            }
        }
    }, [isOpen, order]);

    useEffect(() => {
        const amt = parseFloat(details.amount) || 0;
        const qty = parseInt(details.quantity) || 1;
        const total = amt * qty;
        setPayment(prev => ({ ...prev, total: total, advance: total }));
    }, [details.amount, details.quantity]);

    const handleSearchCustomer = async () => {
        if (!customer.mobile) return;
        try {
            const found = await customerService.search(customer.mobile);
            if (found) {
                setCustomer(prev => ({
                    ...prev,
                    name: found.name || '',
                    id: found.id || prev.mobile
                }));
            }
        } catch (error) { }
    };

    const handleSave = async () => {
        if (!customer.name) return showAlert("Missing Customer", "Customer Name is required.");
        if (!details.serviceName) return showAlert("Missing Service", "Service Name is required.");
        if (!details.amount) return showAlert("Missing Amount", "Amount is required.");

        setSaving(true);
        try {
            // Check for Save as New Service
            if (details.isCustom && saveAsNew) {
                const newPrice = parseFloat(details.amount) || 0;
                // Avoid duplicates if needed, but backend might handle or we just append
                const newServiceItem = {
                    id: null,
                    name: details.serviceName,
                    basePrice: newPrice,
                    customerPrice: newPrice
                };

                // Save updated config
                await configurationService.saveServiceItems([...serviceItems, newServiceItem]);

                // Refresh items to have the latest list (including new ID if we stayed, but we close modal)
                await loadServiceItems();
            }

            // Handle Files: Upload only if they are File objects
            const finalDocIds = await Promise.all(documentIds.map(async (doc) => {
                if (doc instanceof File) {
                    const res = await fileService.upload(doc, "Service");
                    return res.uploadId;
                }
                return doc; // Existing ID
            }));

            const payload = {
                customer: {
                    id: customer.id && customer.id.toString().length > 5 ? customer.id : null,
                    name: customer.name,
                    mobile: customer.mobile
                },
                serviceName: details.serviceName,
                amount: parseFloat(details.amount),
                quantity: parseInt(details.quantity) || 1,
                description: details.description,
                status: order ? order.status : "Pending",
                uploadIdsJson: finalDocIds.length > 0 ? JSON.stringify(finalDocIds) : null,
                payment: {
                    paymentMode: payment.mode,
                    totalAmount: parseFloat(payment.total) || 0,
                    advanceAmount: parseFloat(payment.total) || 0,
                    amountPaid: parseFloat(payment.advance) || 0,
                    discountAmount: parseFloat(payment.discount) || 0,
                    dueAmount: (parseFloat(payment.total) || 0) - (parseFloat(payment.advance) || 0) - (parseFloat(payment.discount) || 0)
                }
            };

            await onSave(payload, order?.id);
            onClose();
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to save service order.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={order ? "Edit Service Request" : "New Service Request"} size="lg">
            <div className="flex flex-col gap-6">
                <CustomerInfo
                    customer={customer}
                    setCustomer={setCustomer}
                    onSearch={handleSearchCustomer}
                    instanceId="service-order-modal"
                    disabled={!!order}
                />

                <div className="bg-card rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider">Service Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className={details.isCustom ? "col-span-1 space-y-2" : "col-span-2 space-y-2"}>
                            <Label>Service</Label>
                            <Select
                                value={details.isCustom ? "Other" : details.serviceName}
                                onValueChange={val => {
                                    if (val === "Other") {
                                        setDetails({
                                            ...details,
                                            isCustom: true,
                                            serviceName: "",
                                            amount: ""
                                        });
                                    } else {
                                        const selected = serviceItems.find(s => s.name === val);
                                        setDetails({
                                            ...details,
                                            isCustom: false,
                                            serviceName: val,
                                            amount: selected ? selected.customerPrice.toString() : ""
                                        });
                                    }
                                }}
                            >
                                <SelectTrigger><SelectValue placeholder="Select Service" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Other">Other</SelectItem>
                                    {serviceItems.map(s => (
                                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {details.isCustom && (
                            <div className="col-span-1 space-y-2">
                                <Label>Service Name</Label>
                                <Input
                                    value={details.serviceName}
                                    onChange={e => setDetails({ ...details, serviceName: e.target.value })}
                                    placeholder="Enter Service Name"
                                />
                                <div className="flex items-center space-x-2 pt-1">
                                    <Checkbox
                                        id="saveAsNew"
                                        checked={saveAsNew}
                                        onCheckedChange={setSaveAsNew}
                                    />
                                    <label
                                        htmlFor="saveAsNew"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                    >
                                        Add New (Save to Config)
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantity</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    onWheel={e => e.target.blur()}
                                    value={details.quantity}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        if (val > 0) setDetails({ ...details, quantity: val });
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input
                                    type="number"
                                    onWheel={e => e.target.blur()}
                                    value={details.amount}
                                    onChange={e => setDetails({ ...details, amount: e.target.value })}
                                    placeholder="0.00"
                                    readOnly={!details.isCustom}
                                    className={!details.isCustom ? "bg-muted" : ""}
                                />
                            </div>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={details.description}
                                onChange={e => setDetails({ ...details, description: e.target.value })}
                                placeholder="Additional details about the service..."
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="col-span-2 space-y-2 pt-2 border-t">
                            <Label>Documents</Label>
                            <FileUpload
                                file={documentIds}
                                onUpload={(docs) => {
                                    const newDocs = Array.isArray(docs) ? docs : [docs];
                                    setDocumentIds(prev => [...prev.filter(d => !(d instanceof File)), ...newDocs]);
                                }}
                                onRemove={(idx) => {
                                    setDocumentIds(prev => prev.filter((_, i) => i !== idx));
                                }}
                                source="Service"
                                multiple={true}
                                instantUpload={false}
                            />
                        </div>
                    </div>
                </div>

                {!order && <PaymentMode payment={payment} setPayment={setPayment} minAdvance={payment.total} />}

                <div className="flex justify-end gap-3 mt-4">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : (order ? "Update Service" : "Save Service")}
                    </Button>
                </div>

                <SimpleAlert
                    open={alertState.open}
                    onOpenChange={(open) => setAlertState(prev => ({ ...prev, open }))}
                    title={alertState.title}
                    description={alertState.description}
                />
            </div>
        </Modal>
    );
}
