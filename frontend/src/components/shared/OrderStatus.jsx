import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { api } from "@/services/api";
import { Loader2 } from "lucide-react";
import { DoneStatusModal } from "./DoneStatusModal";
import { IndianRupee, Smartphone, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Static Helpers (Exported for Reuse) ---

export const getStatusColor = (status) => {
    switch (status) {
        case "Pending": return "bg-red-100 text-red-800 hover:bg-red-200 border-red-200";
        case "Lab Processing":
        case "Processing": return "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200";
        case "Lab Received": return "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200";
        case "Done":
        case "Delivered": return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200";
        case "Failed": return "bg-red-200 text-red-900 hover:bg-red-300 border-red-300";
        case "Refunded": return "bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200";
        case "Discard":
        case "Discarded":
        case "Cancelled": return "bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200 decoration-slice line-through";
        case "In Progress": return "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200";
        default: return "";
    }
};

/**
 * Returns the immediate next logical status for a single click action.
 * Returns null if manual choice is needed (e.g. Pending) or terminal state.
 */
export const getNextAutoStatus = (status, isInstant, type = 'photo-order') => {
    if (type === 'bill-payment' || type === 'money-transfer' || type === 'service-order' || type === 'train-booking') {
        if (status === 'Pending') {
            return (type === 'service-order' || type === 'train-booking') ? 'In Progress' : 'Done';
        }
        if ((type === 'service-order' || type === 'train-booking') && status === 'In Progress') return 'Done';
        return null;
    }

    if (isInstant) {
        if (status === "Processing") return "Delivered";
    } else {
        if (status === "Lab Processing") return "Lab Received";
        if (status === "Lab Received") return "Delivered";
    }
    return null;
};

/**
 * Returns a list of available VALID status transitions for a given order state.
 * Used for Bulk Actions or Menu options.
 */
export const getAvailableTransitions = (status, isInstant, type = 'photo-order') => {
    const transitions = [];

    if (type === 'bill-payment' || type === 'money-transfer' || type === 'service-order' || type === 'train-booking') {
        if (type === 'service-order' || type === 'train-booking') {
            if (status === 'Pending') return ['In Progress', 'Cancelled'];
            if (status === 'In Progress') return ['Done', 'Cancelled', 'Pending'];
            if (['Done', 'Cancelled'].includes(status)) return ['Pending'];
        } else {
            if (status === 'Pending') return ['Done', 'Failed', 'Discard'];
            if (status === 'Failed') return ['Refunded', 'Pending'];
            if (['Done', 'Discard', 'Discarded', 'Refunded'].includes(status)) return ['Pending'];
        }
    } else {
        // Photo Order
        if (status === "Pending") {
            transitions.push(isInstant ? "Processing" : "Lab Processing");
            transitions.push("Discard");
        } else if (status === "Lab Processing") {
            transitions.push("Lab Received");
        } else if (status === "Lab Received") {
            transitions.push("Delivered");
        } else if (status === "Processing") {
            transitions.push("Delivered");
        } else if (status === "Delivered" || status === "Discard" || status === "Discarded") {
            transitions.push("Pending");
        }
        return transitions; // Return built array
    }
    return [];
};


// --- Component ---

export function OrderStatus({ order, onUpdate, type = "photo-order", updateFn = null }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showRollbackAlert, setShowRollbackAlert] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Dropdown / Context Menu State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [dropdownAnchor, setDropdownAnchor] = useState({ x: 0, y: 0 });

    const isInstant = order.isInstant;
    const currentStatus = order.status;

    const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
    const [showDonePrompt, setShowDonePrompt] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [selectedPaymentMode, setSelectedPaymentMode] = useState("Cash");
    const [pendingStatus, setPendingStatus] = useState(null);

    const handleStatusUpdate = async (newStatus, amount = null, profit = null, profitType = null, finalAmount = null, paymentMode = null) => {
        // If transitioning to Done for financial types, prompt for profit
        if (newStatus === 'Done' && (type === 'bill-payment' || type === 'money-transfer' || type === 'service-order' || type === 'train-booking') && profit === null && !showDonePrompt) {
            setPendingStatus(newStatus);
            setShowDonePrompt(true);
            return;
        }

        // If transitioning to Delivered and there's a due amount, prompt for payment if not already provided
        if (newStatus === 'Delivered' && order.payment?.dueAmount > 0 && amount === null && !showPaymentPrompt) {
            setPendingStatus(newStatus);
            setPaymentAmount(order.payment.dueAmount.toString());
            setShowPaymentPrompt(true);
            return;
        }

        setIsLoading(true);
        setErrorMsg(null);

        // Validation for Photo Orders: Block transition from Pending if no file uploaded
        if (type === 'photo-order' && currentStatus === 'Pending' &&
            !['Pending', 'Discard', 'Discarded'].includes(newStatus) && !order.uploadId) {
            setErrorMsg("Please upload a file before processing");
            setIsLoading(false);
            return;
        }

        try {
            let updatedOrder;
            if (updateFn) {
                // Use provided update function (Bill Payment / Money Transfer)
                // We pass profit if available
                updatedOrder = await updateFn(order.id || order.paymentId, newStatus, profit, profitType, finalAmount);
            } else {
                // Default API call (Photo Order)
                // Backend expects @RequestParam, so we pass it in the URL query string
                const queryParams = new URLSearchParams();
                queryParams.append("status", newStatus);
                if (amount) queryParams.append("paymentAmount", amount);
                if (paymentMode) queryParams.append("paymentMode", paymentMode);

                updatedOrder = await api.put(`/orders/${order.orderId}/status?${queryParams.toString()}`, {});
            }

            if (onUpdate) await onUpdate(updatedOrder);
            setIsDropdownOpen(false);
            setShowRollbackAlert(false);
            setShowPaymentPrompt(false);
            setShowDonePrompt(false);
            setPendingStatus(null);
        } catch (error) {
            console.error("Failed to update status", error);
            setErrorMsg("Failed to update status");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeftClick = (e) => {
        e.stopPropagation();
        if (isLoading) return;

        // Validation for Photo Orders: Block transition from Pending if no file uploaded
        if (type === 'photo-order' && currentStatus === 'Pending' && !order.uploadId) {
            setErrorMsg("Please upload a file before processing");
            return;
        }

        // Pending -> Specific Next State logic
        if (currentStatus === "Pending") {
            if (type === 'bill-payment' || type === 'money-transfer' || type === 'service-order' || type === 'train-booking') {
                handleStatusUpdate("Done");
            } else {
                // Photo Order
                handleStatusUpdate(isInstant ? "Processing" : "Lab Processing");
            }
        } else {
            // Auto-Next logic for intermediate steps
            const next = getNextAutoStatus(currentStatus, isInstant, type);
            if (next) handleStatusUpdate(next);
        }
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLoading) return;

        setDropdownAnchor({ x: e.clientX, y: e.clientY });
        setIsDropdownOpen(true);
    };

    const transitions = getAvailableTransitions(currentStatus, isInstant, type);

    return (
        <>
            <Badge
                variant="outline"
                className={`cursor-pointer transition-all shadow-sm select-none ${getStatusColor(currentStatus)} ${isLoading ? "opacity-50" : ""}`}
                onClick={handleLeftClick}
                onContextMenu={handleContextMenu}
            >
                {isLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {currentStatus === "Discarded" ? "Discard" : currentStatus}
            </Badge>

            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger className="fixed invisible w-px h-px" style={{ left: dropdownAnchor.x, top: dropdownAnchor.y }}>
                    <span />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                    {transitions.map((status) => (
                        <DropdownMenuItem
                            key={status}
                            onClick={() => {
                                if (status === 'Pending' && ['Done', 'Failed', 'Discard', 'Refunded', 'Delivered'].includes(currentStatus)) {
                                    setShowRollbackAlert(true);
                                } else {
                                    handleStatusUpdate(status);
                                }
                            }}
                            className={['Discard', 'Failed', 'Cancelled'].includes(status) ? 'text-destructive focus:text-destructive' : ''}
                        >
                            Mark as {status}
                        </DropdownMenuItem>
                    ))}
                    {transitions.length === 0 && <DropdownMenuItem disabled>No actions available</DropdownMenuItem>}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Error Toast/Alert */}
            {errorMsg && (
                <div className="absolute z-50 bg-destructive text-destructive-foreground px-2 py-1 text-xs rounded shadow-lg -mt-8 animate-in fade-in slide-in-from-bottom-1">
                    {errorMsg}
                </div>
            )}

            <SimpleAlert
                open={showRollbackAlert}
                onOpenChange={setShowRollbackAlert}
                title="Rollback Order?"
                description={<>This order is currently <b>{currentStatus}</b>. Do you want to reopen it and set it back to <b>Pending</b>?</>}
                confirmText="Confirm Rollback"
                onConfirm={() => handleStatusUpdate("Pending")}
            />

            <SimpleAlert
                open={showPaymentPrompt}
                onOpenChange={setShowPaymentPrompt}
                type="prompt"
                title="Collect Due Amount"
                description={`Order for ${order.customer?.name} has a pending due of ₹${order.payment?.dueAmount}. Enter amount collected during delivery:`}
                inputValue={paymentAmount}
                onInputChange={setPaymentAmount}
                placeholder="0.00"
                confirmText="Pay & Deliver"
                onConfirm={() => {
                    const amount = parseFloat(paymentAmount);
                    if (isNaN(amount) || amount <= 0) {
                        handleStatusUpdate(pendingStatus, 0); // Just status change
                    } else {
                        handleStatusUpdate(pendingStatus, amount, null, null, null, selectedPaymentMode);
                    }
                }}
            >
                <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-semibold text-muted-foreground">Payment Details</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: "Cash", label: "Cash", icon: IndianRupee },
                            { id: "UPI", label: "UPI", icon: Smartphone },
                            { id: "Bank Transfer", label: "Bank Transfer", icon: Building2 }
                        ].map((m) => {
                            const Icon = m.icon;
                            const isSelected = selectedPaymentMode === m.id;
                            return (
                                <div
                                    key={m.id}
                                    onClick={() => setSelectedPaymentMode(m.id)}
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-slate-50",
                                        isSelected
                                            ? "border-blue-600 bg-blue-50/50 text-blue-600"
                                            : "border-muted text-muted-foreground hover:border-blue-200 hover:text-foreground"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5 mb-1", isSelected ? "text-blue-600" : "text-foreground")} />
                                    <span className="text-xs font-semibold text-center leading-tight">{m.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </SimpleAlert>

            <DoneStatusModal
                isOpen={showDonePrompt}
                onClose={() => setShowDonePrompt(false)}
                totalAmount={order.payment?.totalAmount || order.amount || 0}
                defaultProfitType={type === 'money-transfer' ? 'Additional' : 'Included'}
                onConfirm={(profit, profitType, finalAmount) => {
                    handleStatusUpdate(pendingStatus, null, profit, profitType, finalAmount);
                }}
            />
        </>
    );
}
