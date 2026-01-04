import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
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
        case "Delivered": return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200";
        case "Discarded": return "bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200 decoration-slice line-through";
        default: return "";
    }
};

/**
 * Returns the immediate next logical status for a single click action.
 * Returns null if manual choice is needed (e.g. Pending) or terminal state.
 */
export const getNextAutoStatus = (status, isInstant) => {
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
export const getAvailableTransitions = (status, isInstant) => {
    if (status === "Pending") {
        return isInstant
            ? ["Processing", "Discarded"]
            : ["Lab Processing", "Discarded"];
    }
    if (status === "Lab Processing") return ["Lab Received"];
    if (status === "Lab Received") return ["Delivered"];
    if (status === "Processing") return ["Delivered"];

    // Terminal -> Rollback
    if (status === "Delivered" || status === "Discarded") return ["Pending"];

    return [];
};


// --- Component ---

export function OrderStatus({ order, onUpdate }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showPendingModal, setShowPendingModal] = useState(false);
    const [showRollbackAlert, setShowRollbackAlert] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const isInstant = order.isInstant;
    const currentStatus = order.status;

    const handleStatusUpdate = async (newStatus) => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const updatedOrder = await api.put(`/orders/${order.orderId}/status`, { status: newStatus });
            if (onUpdate) await onUpdate(updatedOrder);
            setShowPendingModal(false);
            setShowRollbackAlert(false);
        } catch (error) {
            console.error("Failed to update status", error);
            setErrorMsg("Failed to update status");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClick = (e) => {
        e.stopPropagation();
        if (isLoading) return;

        if (currentStatus === "Pending") {
            setShowPendingModal(true);
        } else if (currentStatus === "Delivered" || currentStatus === "Discarded") {
            setShowRollbackAlert(true);
        } else {
            const next = getNextAutoStatus(currentStatus, isInstant);
            if (next) handleStatusUpdate(next);
        }
    };

    return (
        <>
            <Badge
                variant="outline"
                className={`cursor-pointer transition-all shadow-sm select-none ${getStatusColor(currentStatus)} ${isLoading ? "opacity-50" : ""}`}
                onClick={handleClick}
            >
                {isLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                {currentStatus}
            </Badge>

            {/* Error Toast/Alert (Simulated inside component for now) */}
            {errorMsg && (
                <div className="absolute z-50 bg-destructive text-destructive-foreground px-2 py-1 text-xs rounded shadow-lg -mt-8 animate-in fade-in slide-in-from-bottom-1">
                    {errorMsg}
                </div>
            )}

            {/* Pending Action Modal */}
            <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
                <DialogContent onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Update Order Status</DialogTitle>
                        <DialogDescription>
                            Choose the next step for this <b>{isInstant ? "Instant" : "Regular"}</b> order.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-4 justify-center py-4">
                        <Button
                            variant="destructive"
                            className="flex-1 max-w-[150px]"
                            onClick={() => handleStatusUpdate("Discarded")}
                            disabled={isLoading}
                        >
                            Discard
                        </Button>
                        <Button
                            className="flex-1 max-w-[150px] bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => handleStatusUpdate(isInstant ? "Processing" : "Lab Processing")}
                            disabled={isLoading}
                        >
                            {isInstant ? "Start Processing" : "Send to Lab"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

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
