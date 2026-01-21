import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerInfo } from "./CustomerInfo";
import { PaymentMode } from "./PaymentMode";
import { customerService } from "@/services/customerService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function MoneyTransferModal({ isOpen, onClose, onSave }) {
    const [activeTab, setActiveTab] = useState("UPI");

    // Customer State
    const [customer, setCustomer] = useState({ mobile: '', name: '', id: '' });

    // Details State
    const [details, setDetails] = useState({
        upiId: "",
        mobileNumber: "",
        recipientName: "",
        bankName: "",
        customBankName: "",
        ifscCode: "",
        accountNumber: "",
        amount: ""
    });

    // Payment State
    const [payment, setPayment] = useState({ mode: 'Cash', total: 0, discount: 0, advance: 0 });
    const [uploadId, setUploadId] = useState(null);
    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });

    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    useEffect(() => {
        if (!isOpen) {
            setCustomer({ mobile: '', name: '', id: '' });
            setActiveTab("UPI");
            setDetails({
                upiId: "",
                mobileNumber: "",
                recipientName: "",
                bankName: "",
                customBankName: "",
                ifscCode: "",
                accountNumber: "",
                amount: ""
            });
            setPayment({ mode: 'Cash', total: 0, discount: 0, advance: 0 });
            setUploadId(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const amt = parseFloat(details.amount) || 0;
        setPayment(prev => ({ ...prev, total: amt, advance: amt }));
    }, [details.amount]);

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
        if (!details.amount) return showAlert("Missing Amount", "Amount is required.");
        if (!details.recipientName) return showAlert("Missing Recipient", "Recipient Name is required.");

        if (activeTab === 'UPI') {
            if (!details.upiId && !details.mobileNumber) {
                return showAlert("Missing Details", "Either UPI ID or Mobile Number is required for UPI transfer.");
            }
        } else {
            if (!details.bankName || !details.accountNumber || !details.ifscCode) {
                return showAlert("Missing Details", "Bank Name, Account Number, and IFSC are required.");
            }
            if (details.bankName === 'Other' && !details.customBankName) {
                return showAlert("Missing Details", "Please specify the Bank Name.");
            }
        }

        const payload = {
            transferType: activeTab,
            customer: {
                id: customer.id && customer.id.length > 5 ? customer.id : null,
                name: customer.name,
                mobile: customer.mobile
            },
            upiId: details.upiId,
            mobileNumber: details.mobileNumber,
            recipientName: details.recipientName,
            bankName: details.bankName === 'Other' ? details.customBankName : details.bankName,
            ifscCode: details.ifscCode,
            accountNumber: details.accountNumber,
            amount: parseFloat(details.amount),
            status: "Pending",
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
            onClose();
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to save transfer.");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="New Money Transfer" size="lg">
            <div className="flex flex-col gap-6">
                <div className="flex p-1 bg-muted rounded-lg w-full">
                    {["UPI", "ACCOUNT"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === tab
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                }`}
                        >
                            {tab === "UPI" ? "UPI" : "Account Transfer"}
                        </button>
                    ))}
                </div>

                <CustomerInfo
                    customer={customer}
                    setCustomer={setCustomer}
                    onSearch={handleSearchCustomer}
                    instanceId="money-transfer-modal"
                />

                <div className="bg-card rounded-lg border p-4">
                    <h3 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider">Transfer Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {activeTab === 'UPI' ? (
                            <>
                                <div className="space-y-2">
                                    <Label>UPI ID</Label>
                                    <Input value={details.upiId} onChange={e => setDetails({ ...details, upiId: e.target.value })} placeholder="example@upi" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Recipient Mobile</Label>
                                    <Input value={details.mobileNumber} onChange={e => setDetails({ ...details, mobileNumber: e.target.value })} placeholder="10-digit number" maxLength={10} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label>Bank Name</Label>
                                    <Select value={details.bankName} onValueChange={val => setDetails({ ...details, bankName: val })}>
                                        <SelectTrigger><SelectValue placeholder="Select Bank" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SBI">SBI</SelectItem>
                                            <SelectItem value="HDFC">HDFC</SelectItem>
                                            <SelectItem value="ICICI">ICICI</SelectItem>
                                            <SelectItem value="Axis">Axis</SelectItem>
                                            <SelectItem value="PNB">PNB</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {details.bankName === 'Other' && (
                                    <div className="space-y-2">
                                        <Label>Specify Bank Name</Label>
                                        <Input value={details.customBankName} onChange={e => setDetails({ ...details, customBankName: e.target.value })} placeholder="Enter bank name" />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label>IFSC Code</Label>
                                    <Input value={details.ifscCode} onChange={e => setDetails({ ...details, ifscCode: e.target.value.toUpperCase() })} placeholder="IFSC0001234" maxLength={11} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label>Account Number</Label>
                                    <Input value={details.accountNumber} onChange={e => setDetails({ ...details, accountNumber: e.target.value })} placeholder="Account Number" />
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <Label>Recipient Name</Label>
                            <Input value={details.recipientName} onChange={e => setDetails({ ...details, recipientName: e.target.value })} placeholder="Name of recipient" />
                        </div>
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input type="number" onWheel={e => e.target.blur()} value={details.amount} onChange={e => setDetails({ ...details, amount: e.target.value })} placeholder="0.00" />
                        </div>
                    </div>
                </div>

                <PaymentMode payment={payment} setPayment={setPayment} minAdvance={payment.total} />

                <div className="flex justify-end gap-3 mt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Transfer</Button>
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
