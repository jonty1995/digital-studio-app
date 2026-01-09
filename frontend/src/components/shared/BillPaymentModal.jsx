import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerInfo } from "./CustomerInfo";
import { PaymentMode } from "./PaymentMode";
import { billPaymentService } from "@/services/billPaymentService";
import { customerService } from "@/services/customerService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function BillPaymentModal({ isOpen, onClose, onSave }) {
    const [activeTab, setActiveTab] = useState("ELECTRICITY");

    // Customer State
    const [customer, setCustomer] = useState({ mobile: '', name: '', id: '' });

    // Transaction Details State
    const [transactionDetails, setTransactionDetails] = useState({
        operator: "",
        referenceId: "", // Consumer No, Mobile No, Subscriber ID
        billCustomerName: "", // For Electricity
        amount: ""
    });

    // Payment State (Reused Component)
    const [payment, setPayment] = useState({ mode: 'Cash', total: 0, discount: 0, advance: 0 });
    const [uploadId, setUploadId] = useState(null);

    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });

    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    // Reset fields when modal closes
    useEffect(() => {
        if (!isOpen) {
            setCustomer({ mobile: '', name: '', id: '' });
            setActiveTab("ELECTRICITY");
            setTransactionDetails({
                operator: "CESC",
                billId: "",
                billCustomerName: "",
                status: "Pending",
                amount: ""
            });
            setPayment({ mode: 'Cash', total: 0, discount: 0, advance: 0 });
            setUploadId(null);
        }
    }, [isOpen]);

    // Reset fields when tab changes
    useEffect(() => {
        setTransactionDetails({
            operator: activeTab === 'ELECTRICITY' ? "CESC" : "",
            billId: "",
            billCustomerName: "",
            status: "Pending",
            amount: ""
        });
        setPayment(prev => ({ ...prev, total: 0, advance: 0 }));
    }, [activeTab]);

    // Update Payment Total when Amount changes
    useEffect(() => {
        const amt = parseFloat(transactionDetails.amount) || 0;
        setPayment(prev => ({ ...prev, total: amt, advance: amt })); // Usually full payment
    }, [transactionDetails.amount]);

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
        } catch (error) {
            // Not found
        }
    };

    const handleSaveTransaction = async () => {
        // Validation
        if (!customer.name) {
            showAlert("Missing Customer", "Customer Name is required.");
            return;
        }
        if (!transactionDetails.amount) {
            showAlert("Missing Amount", "Amount is required.");
            return;
        }
        if (activeTab === 'ELECTRICITY') {
            if (!transactionDetails.operator || !transactionDetails.billId) {
                showAlert("Missing Details", "Operator and Consumer ID are required.");
                return;
            }
            if (transactionDetails.operator === "CESC" && transactionDetails.billId.length !== 11) {
                showAlert("Invalid ID", "CESC Consumer ID must be exactly 11 digits.");
                return;
            }
        }
        if ((activeTab === 'MOBILE' || activeTab === 'DTH') && (!transactionDetails.operator || !transactionDetails.billId)) {
            showAlert("Missing Details", "Operator and ID/Number are required.");
            return;
        }

        const payload = {
            transactionType: activeTab,
            customer: {
                id: customer.id && customer.id.length > 5 ? customer.id : null,
                name: customer.name,
                mobile: customer.mobile
            },
            operator: transactionDetails.operator,
            billId: transactionDetails.billId,
            billCustomerName: transactionDetails.billCustomerName,
            status: transactionDetails.status,
            uploadId: (uploadId && typeof uploadId === 'string') ? uploadId : null,
            payment: {
                paymentMode: payment.mode,
                totalAmount: parseFloat(payment.total) || 0,
                advanceAmount: parseFloat(payment.total) || 0,
                amountPaid: parseFloat(payment.advance) || 0,
                discountAmount: parseFloat(payment.discount) || 0,
                dueAmount: (parseFloat(payment.total) || 0) - (parseFloat(payment.advance) || 0) - (parseFloat(payment.discount) || 0)
            }
        };

        const fileToUpload = (uploadId instanceof File) ? uploadId : null;
        try {
            await onSave(payload, fileToUpload);
            // onSave(); Removed redundant call
            onClose();
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to save transaction.");
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case "ELECTRICITY":
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Operator</Label>
                            <Select
                                value={transactionDetails.operator}
                                onValueChange={(val) => setTransactionDetails({ ...transactionDetails, operator: val })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select Operator" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CESC">CESC</SelectItem>
                                    <SelectItem value="WBSEDCL">WBSEDCL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Consumer ID</Label>
                            <Input
                                value={transactionDetails.billId}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    if (transactionDetails.operator === "CESC" && val.length > 11) return;
                                    setTransactionDetails({ ...transactionDetails, billId: val });
                                }}
                                placeholder="Consumer ID"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bill Customer Name</Label>
                            <Input
                                value={transactionDetails.billCustomerName}
                                onChange={(e) => setTransactionDetails({ ...transactionDetails, billCustomerName: e.target.value })}
                                placeholder="Name on Bill"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Bill Amount</Label>
                            <Input
                                type="number"
                                onWheel={(e) => e.target.blur()}
                                min="0"
                                value={transactionDetails.amount}
                                onChange={(e) => setTransactionDetails({ ...transactionDetails, amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                );
            case "MOBILE":
                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Operator</Label>
                            <Select
                                value={transactionDetails.operator}
                                onValueChange={(val) => setTransactionDetails({ ...transactionDetails, operator: val })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select Operator" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Jio">Jio</SelectItem>
                                    <SelectItem value="Airtel">Airtel</SelectItem>
                                    <SelectItem value="Vi">Vi</SelectItem>
                                    <SelectItem value="BSNL">BSNL</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Mobile Number</Label>
                            <Input
                                value={transactionDetails.billId}
                                onChange={(e) => setTransactionDetails({ ...transactionDetails, billId: e.target.value })}
                                placeholder="10-digit Number"
                                maxLength={10}
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                onWheel={(e) => e.target.blur()}
                                value={transactionDetails.amount}
                                onChange={(e) => setTransactionDetails({ ...transactionDetails, amount: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                );
            case "DTH":
                const getLabelAndPlaceholder = (op) => {
                    switch (op) {
                        case "Dish TV": return { label: "Mobile / Viewing Card No", placeholder: "Enter Mobile or VC Number" };
                        case "d2h": return { label: "Subscriber ID", placeholder: "Enter Subscriber ID" };
                        case "Tata Play": return { label: "Subscriber ID / Mobile No", placeholder: "Enter ID or Mobile" };
                        case "Airtel DTH": return { label: "Customer ID", placeholder: "Enter Customer ID" };
                        case "Sun Direct": return { label: "Smart Card Number", placeholder: "Enter Smart Card Number" };
                        default: return { label: "Subscriber ID", placeholder: "Subscriber ID" };
                    }
                };
                const { label, placeholder } = getLabelAndPlaceholder(transactionDetails.operator);

                return (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Operator</Label>
                            <Select
                                value={transactionDetails.operator}
                                onValueChange={(val) => setTransactionDetails({ ...transactionDetails, operator: val })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select Operator" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tata Play">Tata Play</SelectItem>
                                    <SelectItem value="Airtel DTH">Airtel DTH</SelectItem>
                                    <SelectItem value="Dish TV">Dish TV</SelectItem>
                                    <SelectItem value="Sun Direct">Sun Direct</SelectItem>
                                    <SelectItem value="d2h">d2h</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{label}</Label>
                            <Input
                                value={transactionDetails.billId}
                                onChange={(e) => setTransactionDetails({ ...transactionDetails, billId: e.target.value })}
                                placeholder={placeholder}
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                onWheel={(e) => e.target.blur()}
                                min="0"
                                value={transactionDetails.amount}
                                onChange={(e) => setTransactionDetails({ ...transactionDetails, amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Bill Payment" size="lg">
            <div className="flex flex-col gap-6">

                {/* Tabs */}
                <div className="flex p-1 bg-muted rounded-lg w-full">
                    {["ELECTRICITY", "MOBILE", "DTH"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === tab
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                }`}
                        >
                            {tab === "DTH" ? "DTH" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>

                {/* Customer Info (Reused) */}
                {/* Customer Info (Reused) */}
                <CustomerInfo
                    customer={customer}
                    setCustomer={setCustomer}
                    onSearch={handleSearchCustomer}
                    instanceId="bill-payment-modal"
                />

                {/* Transaction Details (Dynamic based on Tab) */}
                <div className="bg-card rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider">Transaction Details</h3>
                    {renderTabContent()}
                </div>

                {/* Payment Mode (Reused) */}
                <PaymentMode
                    payment={payment}
                    setPayment={setPayment}
                    minAdvance={payment.total}
                />

                <div className="flex justify-end gap-3 mt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSaveTransaction}>Save Transaction</Button>
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
