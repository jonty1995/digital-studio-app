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
        case "Discarded": return "bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200 decoration-slice line-through";
        default: return "";
    }
};

/**
 * Returns the immediate next logical status for a single click action.
 * Returns null if manual choice is needed (e.g. Pending) or terminal state.
 */
export const getNextAutoStatus = (status, isInstant, type = 'photo-order') => {
    if (type === 'bill-payment') {
        // Bill Payment usually requires choice (Done/Failed), no auto-advance on single click from Pending?
        // Maybe Pending -> Done on single click? User asked for Left Click = Done.
        if (status === 'Pending') return 'Done';
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

    if (type === 'bill-payment') {
        if (status === 'Pending') return ['Done', 'Failed', 'Discard'];
        if (status === 'Failed') return ['Refunded', 'Pending'];
        if (['Done', 'Discard', 'Discarded', 'Refunded'].includes(status)) return ['Pending'];
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

    const handleStatusUpdate = async (newStatus) => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            let updatedOrder;
            if (updateFn) {
                // Use provided update function (Bill Payment)
                // Assuming updateFn returns the updated object or we just trigger refresh via onUpdate
                updatedOrder = await updateFn(order.id || order.paymentId, newStatus);
            } else {
                // Default API call (Photo Order)
                updatedOrder = await api.put(`/orders/${order.orderId}/status`, { status: newStatus });
            }

            if (onUpdate) await onUpdate(updatedOrder);
            setIsDropdownOpen(false);
            setShowRollbackAlert(false);
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

        // Pending -> Specific Next State logic
        if (currentStatus === "Pending") {
            if (type === 'bill-payment') {
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
                            className={status === 'Discard' || status === 'Failed' ? 'text-destructive focus:text-destructive' : ''}
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
        </>
    );
}
