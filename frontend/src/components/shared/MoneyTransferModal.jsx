import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerInfo } from "./CustomerInfo";
import { PaymentMode } from "./PaymentMode";
import { customerService } from "@/services/customerService";
import { moneyTransferService } from "@/services/moneyTransferService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function MoneyTransferModal({ isOpen, onClose, onSave, transaction = null }) {
    const [activeTab, setActiveTab] = useState("UPI");
    const [suggestions, setSuggestions] = useState([]);

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
    const [saving, setSaving] = useState(false);

    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    useEffect(() => {
        if (!isOpen) {
            setCustomer({ mobile: '', name: '', id: '' });
            if (!transaction) {
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
        } else if (transaction) {
            // Edit Mode
            setActiveTab(transaction.transferType || "UPI");
            setCustomer({
                mobile: transaction.customer?.mobile || '',
                name: transaction.customer?.name || '',
                id: transaction.customer?.id || ''
            });

            // Bank Name Logic (Check if standard or custom)
            const standardBanks = ["SBI", "HDFC", "ICICI", "Axis", "PNB"];
            const isStandard = standardBanks.includes(transaction.bankName);

            setDetails({
                upiId: transaction.upiId || "",
                mobileNumber: transaction.mobileNumber || "",
                recipientName: transaction.recipientName || "",
                bankName: (transaction.transferType === "ACCOUNT" ? (isStandard ? transaction.bankName : "Other") : ""),
                customBankName: (transaction.transferType === "ACCOUNT" && !isStandard ? transaction.bankName : ""),
                ifscCode: transaction.ifscCode || "",
                accountNumber: transaction.accountNumber || "",
                amount: transaction.amount?.toString() || ""
            });

            setPayment({
                mode: transaction.payment?.paymentMode || 'Cash',
                total: transaction.payment?.totalAmount || 0,
                discount: transaction.payment?.discountAmount || 0,
                advance: transaction.payment?.amountPaid || 0
            });
            setUploadId(transaction.uploadId);
        }
    }, [isOpen, transaction]);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (customer.mobile && customer.mobile.length === 10) {
                try {
                    const data = await moneyTransferService.getSuggestions(customer.mobile);
                    setSuggestions(data || []);
                } catch (e) {
                    console.error("Failed to fetch suggestions", e);
                }
            } else {
                setSuggestions([]);
            }
        };
        const timer = setTimeout(fetchSuggestions, 500);
        return () => clearTimeout(timer);
    }, [customer.mobile]);

    const handleApplySuggestion = (s) => {
        setDetails(prev => ({
            ...prev,
            recipientName: s.recipientName || prev.recipientName,
            bankName: s.bankName || prev.bankName,
            // If bank is not standard, it goes to custom
            customBankName: s.transferType === 'ACCOUNT' && !["SBI", "HDFC", "ICICI", "Axis", "PNB"].includes(s.bankName) ? s.bankName : "",
            ifscCode: s.ifscCode || prev.ifscCode,
            accountNumber: s.accountNumber || prev.accountNumber,
            upiId: (s.transferType === 'UPI' && s.upiId) ? s.upiId : prev.upiId
        }));
        if (s.transferType) setActiveTab(s.transferType);
    };

    const renderSuggestions = () => {
        const scrollContainerRef = useRef(null);
        const scroll = (direction) => {
            if (scrollContainerRef.current) {
                const scrollAmount = 200;
                scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
            }
        };

        if (!suggestions || suggestions.length === 0) return null;

        return (
            <div className="w-full mb-4">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Recent Transfers</Label>
                <div className="relative group/carousel">
                    <button type="button" onClick={() => scroll('left')} className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border rounded-full p-1 shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0"><ChevronLeft className="w-4 h-4 text-foreground" /></button>
                    <div ref={scrollContainerRef} className="flex gap-3 overflow-x-auto scrollbar-hide py-1 px-1 scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {suggestions.map((s, idx) => (
                            <button key={idx} type="button" onClick={() => handleApplySuggestion(s)} className="flex-none w-[150px] text-xs border rounded-md p-2 bg-card hover:bg-accent hover:border-primary/50 transition-all text-left flex flex-col gap-1 shadow-sm group/item relative overflow-hidden" title="Click to apply">
                                <div className={`absolute top-0 left-0 w-1 h-full ${idx % 3 === 0 ? 'bg-gradient-to-b from-blue-400 to-blue-600' : idx % 3 === 1 ? 'bg-gradient-to-b from-purple-400 to-purple-600' : 'bg-gradient-to-b from-orange-400 to-orange-600'}`} />
                                <div className="pl-2.5 w-full">
                                    <div className="flex justify-between items-start w-full gap-2 mb-1">
                                        <span className={`font-bold line-clamp-1 ${idx % 3 === 0 ? 'text-blue-600' : idx % 3 === 1 ? 'text-purple-600' : 'text-orange-600'}`} title={s.recipientName}>{s.recipientName}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-mono text-[10px] text-foreground/90 font-medium block truncate">{s.transferType === 'UPI' ? 'UPI' : s.bankName}</span>
                                        <span className="text-[9px] text-muted-foreground truncate w-full block">{s.transferType === 'UPI' ? s.upiId : s.accountNumber}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={() => scroll('right')} className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border rounded-full p-1 shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity"><ChevronRight className="w-4 h-4 text-foreground" /></button>
                </div>
            </div>
        );
    };

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

        setSaving(true);
        try {
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
                status: transaction?.status || "Pending",
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
            await onSave(payload, fileToUpload, transaction?.id);
            onClose();
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to save transfer.");
        } finally {
            setSaving(false);
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

                {renderSuggestions()}

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
