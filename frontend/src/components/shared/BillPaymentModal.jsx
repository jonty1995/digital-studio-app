import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerInfo } from "./CustomerInfo";
import { PaymentMode } from "./PaymentMode";
import { billPaymentService } from "@/services/billPaymentService";
import { customerService } from "@/services/customerService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function BillPaymentModal({ isOpen, onClose, onSave, transaction = null }) {
    const [activeTab, setActiveTab] = useState("ELECTRICITY");

    // Customer State
    const [customer, setCustomer] = useState({ mobile: '', name: '', id: '' });

    // Transaction Details State
    const [transactionDetails, setTransactionDetails] = useState({
        operator: "",
        billId: "",
        billCustomerName: "",
        amount: "",
        status: "Pending" // Added Status to details
    });

    // Payment State (Reused Component)
    const [payment, setPayment] = useState({ mode: 'Cash', total: 0, discount: 0, advance: 0 });
    const [uploadId, setUploadId] = useState(null);

    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });
    const [saving, setSaving] = useState(false); // Add saving state

    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    // Reset fields when modal closes or transaction changes
    useEffect(() => {
        if (!isOpen) {
            setCustomer({ mobile: '', name: '', id: '' });
            if (!transaction) { // Only reset to defaults if NOT editing
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
        } else if (transaction) {
            // Edit Mode
            setActiveTab(transaction.transactionType || "ELECTRICITY");
            setCustomer({
                mobile: transaction.customer?.mobile || '',
                name: transaction.customer?.name || '',
                id: transaction.customer?.id || ''
            });
            setTransactionDetails({
                operator: transaction.operator || "",
                billId: transaction.billId || "",
                billCustomerName: transaction.billCustomerName || "",
                status: transaction.status || "Pending",
                amount: transaction.payment?.totalAmount?.toString() || ""
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

    // Reset fields when tab changes (BUT ONLY IF NOT EDITING or if tab mismatches)
    useEffect(() => {
        if (!isOpen) return;
        // If we are editing and switch to the tab that matches the transaction, restore it? 
        // For simplicity, if user switches tabs, we treat it as "New" for that tab unless it matches current transaction type
        if (transaction && activeTab === transaction.transactionType) {
            // Restore (already done by main useEffect, but maybe needed here?)
            return;
        }

        // Reset defaults for new tab intent
        if (!transaction || activeTab !== transaction.transactionType) {
            setTransactionDetails({
                operator: activeTab === 'ELECTRICITY' ? "CESC" : "",
                billId: "",
                billCustomerName: "",
                status: "Pending",
                amount: ""
            });
            setPayment(prev => ({ ...prev, total: 0, advance: 0 }));
        }
    }, [activeTab]);

    // Update Payment Total when Amount changes
    useEffect(() => {
        const amt = parseFloat(transactionDetails.amount) || 0;
        setPayment(prev => ({ ...prev, total: amt, advance: amt }));
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
        } catch (error) { }
    };

    const handleSaveTransaction = async () => {
        if (!customer.name) return showAlert("Missing Customer", "Customer Name is required.");
        if (!transactionDetails.amount) return showAlert("Missing Amount", "Amount is required.");

        if (activeTab === 'ELECTRICITY') {
            if (!transactionDetails.operator || !transactionDetails.billId) return showAlert("Missing Details", "Operator and Consumer ID are required.");
            if (transactionDetails.operator === "CESC" && transactionDetails.billId.length !== 11) return showAlert("Invalid ID", "CESC Consumer ID must be exactly 11 digits.");
        }
        if ((activeTab === 'MOBILE' || activeTab === 'DTH') && (!transactionDetails.operator || !transactionDetails.billId)) {
            return showAlert("Missing Details", "Operator and ID/Number are required.");
        }

        setSaving(true);
        try {
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
            await onSave(payload, fileToUpload, transaction?.id); // Pass ID if editing
            onClose();
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to save transaction.");
        } finally {
            setSaving(false);
        }
    };

    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (customer.mobile && !transaction) {
                try {
                    const data = await billPaymentService.getSuggestions(customer.mobile);
                    setSuggestions(data || []);
                } catch (err) {
                    console.error("Failed to load suggestions", err);
                }
            } else {
                setSuggestions([]);
            }
        };
        // Debounce slightly to avoid too many calls
        const timeoutId = setTimeout(fetchSuggestions, 500);
        return () => clearTimeout(timeoutId);
    }, [customer.mobile, transaction]);

    const handleApplySuggestion = (s) => {
        // Switch tab if needed
        if (s.transactionType && s.transactionType !== activeTab) {
            setActiveTab(s.transactionType);
        }
        setTransactionDetails(prev => ({
            ...prev,
            operator: s.operator || prev.operator,
            billId: s.billId,
            billCustomerName: s.billCustomerName || ""
        }));
    };

    const renderSuggestions = () => {
        const filteredSuggestions = suggestions.filter(s => s.transactionType === activeTab);
        const scrollContainerRef = useRef(null);

        const scroll = (direction) => {
            if (scrollContainerRef.current) {
                const scrollAmount = 200;
                scrollContainerRef.current.scrollBy({
                    left: direction === 'left' ? -scrollAmount : scrollAmount,
                    behavior: 'smooth'
                });
            }
        };

        if (filteredSuggestions.length === 0) return null;

        return (
            <div className="w-full mb-4">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Recent Bills</Label>
                <div className="relative group/carousel">
                    {/* Left Scroll Button */}
                    <button
                        type="button"
                        onClick={() => scroll('left')}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border rounded-full p-1 shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity disabled:opacity-0"
                    >
                        <ChevronLeft className="w-4 h-4 text-foreground" />
                    </button>

                    {/* Scrollable Container */}
                    <div
                        ref={scrollContainerRef}
                        className="flex gap-3 overflow-x-auto scrollbar-hide py-1 px-1 scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {filteredSuggestions.map((s, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleApplySuggestion(s)}
                                className="flex-none w-[150px] text-xs border rounded-md p-2 bg-card hover:bg-accent hover:border-primary/50 transition-all text-left flex flex-col gap-1 shadow-sm group/item relative overflow-hidden"
                                title="Click to apply"
                            >
                                {/* Color accent bar based on operator hash simulation */}
                                <div className={`absolute top-0 left-0 w-1 h-full ${idx % 3 === 0 ? 'bg-gradient-to-b from-blue-400 to-blue-600' :
                                    idx % 3 === 1 ? 'bg-gradient-to-b from-purple-400 to-purple-600' :
                                        'bg-gradient-to-b from-orange-400 to-orange-600'
                                    }`} />

                                <div className="pl-2.5 w-full">
                                    <div className="flex justify-between items-start w-full gap-2 mb-1">
                                        <span className={`font-bold line-clamp-1 ${idx % 3 === 0 ? 'text-blue-600 dark:text-blue-400' :
                                            idx % 3 === 1 ? 'text-purple-600 dark:text-purple-400' :
                                                'text-orange-600 dark:text-orange-400'
                                            }`} title={s.operator}>{s.operator}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-mono text-[10px] text-foreground/90 font-medium block truncate" title={s.billId}>{s.billId}</span>
                                        {s.billCustomerName && (
                                            <span className="text-[9px] text-muted-foreground truncate w-full block" title={s.billCustomerName}>
                                                {s.billCustomerName}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Right Scroll Button */}
                    <button
                        type="button"
                        onClick={() => scroll('right')}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background border rounded-full p-1 shadow-md opacity-0 group-hover/carousel:opacity-100 transition-opacity"
                    >
                        <ChevronRight className="w-4 h-4 text-foreground" />
                    </button>
                </div>
            </div>
        );
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
                    {renderSuggestions()}
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
