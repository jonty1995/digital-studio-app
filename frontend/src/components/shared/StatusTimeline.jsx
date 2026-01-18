import React from 'react';
import { format } from 'date-fns';
import { ClipboardList, Package, Truck, Home, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/CopyButton";

export function StatusTimeline(props) {
    const { order } = props; // Support passing props.type
    const isInstant = order.isInstant;
    const currentStatus = order.status;
    const history = order.statusHistoryJson ? JSON.parse(order.statusHistoryJson) : [];

    // Construct the Ideal Flow
    let steps = [];

    if (props.type === 'bill-payment' || props.type === 'money-transfer') {
        steps = [
            { id: 'Pending', label: 'Pending', icon: ClipboardList },
            { id: 'Done', label: 'Done', icon: CheckCircle2 },
        ];
        if (currentStatus === 'Failed') {
            steps = [
                { id: 'Pending', label: 'Pending', icon: ClipboardList },
                { id: 'Failed', label: 'Failed', icon: Trash2, isDestructive: true }, // Reusing Trash icon or X?
            ];
        } else if (currentStatus === 'Discard' || currentStatus === 'Discarded') {
            steps = [
                { id: 'Pending', label: 'Pending', icon: ClipboardList },
                { id: 'Discard', label: 'Discard', icon: Trash2, isDestructive: true },
            ];
        }
    } else {
        // Photo Orders
        if (isInstant) {
            steps = [
                { id: 'Pending', label: 'Pending', icon: ClipboardList },
                { id: 'Processing', label: 'Processing', icon: Package },
                { id: 'Delivered', label: 'Delivered', icon: Home },
            ];
        } else {
            steps = [
                { id: 'Pending', label: 'Pending', icon: ClipboardList },
                { id: 'Lab Processing', label: 'Lab Processing', icon: Package },
                { id: 'Lab Received', label: 'Lab Received', icon: Truck },
                { id: 'Delivered', label: 'Delivered', icon: Home },
            ];
        }

        // Photo Order Discard Check
        if (currentStatus === 'Discard' || currentStatus === 'Discarded') {
            steps = [
                { id: 'Pending', label: 'Pending', icon: ClipboardList },
                { id: 'Discard', label: 'Discard', icon: Trash2, isDestructive: true },
            ];
        }
    }

    // Map History to Steps to find completion times
    // We look for the LATEST entry for each status in history
    const getStepInfo = (stepId) => {
        // Find *latest* occurrence of this status
        // History is chronological.
        const entry = [...history].reverse().find(h => h.status === stepId);

        // Also check if this step is "Active" (currentStatus matches)
        const isActive = currentStatus === stepId;

        // Check if "Completed" (present in history OR passed in flow)
        // If we are at "Delivered", then "Pending" is definitely completed.
        // Simple index check logic:
        const currentIndex = steps.findIndex(s => s.id === currentStatus);
        const thisIndex = steps.findIndex(s => s.id === stepId);

        // Flow Logic: 
        // 1. Past steps (index < current) are COMPLETED.
        // 2. Current step is ACTIVE.
        // 3. Future steps (index > current) are PENDING/INACTIVE, regardless of history (stale history).
        const isPast = currentIndex > thisIndex;
        const isFuture = currentIndex < thisIndex;

        let timestamp = entry ? entry.timestamp : null;

        // Fallback for Pending: If no explicit history, use createdAt
        if (stepId === 'Pending' && !timestamp && order.createdAt) {
            timestamp = order.createdAt;
        }

        // CRITICAL FIX: Hide timestamp if this step is technically "in the future" relative to current status
        // This handles cases where user reverts status (e.g. Done -> Pending) but old "Done" history exists.
        if (isFuture) {
            timestamp = null;
        }

        const isCompleted = isActive || isPast;

        return {
            timestamp: isCompleted ? timestamp : null, // Only show timestamp if step is actually completed/active in current flow
            isActive,
            isCompleted
        };
    };

    const OrderIdDisplay = order.orderId || order.id; // PhotoOrder uses orderId, BillPayment uses id
    const uploadLabel = (props.type === 'bill-payment' || props.type === 'money-transfer') ? 'Receipt ID' : 'Upload ID';

    return (
        <div className="flex flex-col gap-6">
            {/* Timeline Section */}
            <div className="px-4 bg-background/50 rounded-lg border py-2">
                <div className="w-full py-4 overflow-x-auto">
                    <div className="flex items-start justify-between relative min-w-[600px]">
                        {/* Connecting Line - Background */}
                        <div className="absolute top-4 left-0 w-full h-1 bg-gray-200 rounded -z-0"></div>

                        {steps.map((step, index) => {
                            const { timestamp, isActive, isCompleted } = getStepInfo(step.id);
                            // const isLast = index === steps.length - 1;
                            const Icon = step.icon;

                            // Color Logic
                            let colorClass = "bg-gray-200 text-gray-400 border-gray-300";
                            if (step.isDestructive && (isActive || isCompleted)) {
                                colorClass = "bg-red-100 text-red-600 border-red-500 scale-110";
                            } else if (isActive) {
                                colorClass = "bg-primary text-primary-foreground border-primary scale-110 ring-4 ring-primary/20";
                            } else if (isCompleted) {
                                colorClass = "bg-emerald-100 text-emerald-600 border-emerald-500";
                            }

                            return (
                                <div key={step.id} className="relative flex flex-col items-center flex-1 z-10 group">
                                    {index > 0 && (
                                        <div className={cn(
                                            "absolute top-4 right-[50%] w-full h-1 -z-10",
                                            getStepInfo(steps[index - 1].id).isCompleted && (isCompleted || isActive)
                                                ? (step.isDestructive ? "bg-red-200" : "bg-emerald-400")
                                                : "bg-gray-200"
                                        )}></div>
                                    )}

                                    <div className={cn(
                                        "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 bg-background",
                                        colorClass
                                    )}>
                                        <Icon className="w-4 h-4" />
                                    </div>

                                    <div className="mt-3 flex flex-col items-center text-center">
                                        <span className={cn(
                                            "text-xs font-bold uppercase tracking-wider",
                                            isActive ? "text-primary" : "text-muted-foreground"
                                        )}>
                                            {step.label}
                                        </span>
                                        {timestamp && (
                                            <span className="text-[10px] font-mono text-muted-foreground mt-1">
                                                {format(new Date(timestamp), "dd MMM yy")}
                                                <br />
                                                {format(new Date(timestamp), "hh:mm a")}
                                            </span>
                                        )}
                                        {!timestamp && isActive && (
                                            <span className="text-[10px] text-amber-600 font-medium mt-1 animate-pulse">
                                                Current
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Details Grid (Previously in Page) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm pl-4 relative mb-4">
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary/20 rounded-full"></div>

                {/* Payment Mode */}
                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold">Payment Mode</span>
                    <span className="font-medium">
                        {order.payment?.paymentMode ? (
                            <Badge variant="outline" className="bg-background text-foreground/80 font-normal">
                                {order.payment.paymentMode}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground italic">N/A</span>
                        )}
                    </span>
                </div>

                {/* Order ID */}
                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold">Order ID</span>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground font-medium">{OrderIdDisplay}</span>
                        <CopyButton
                            text={String(OrderIdDisplay)}
                            className="h-5 w-5 bg-background border shadow-sm"
                            title="Copy Order ID"
                        />
                    </div>
                </div>

                {/* Upload/Receipt ID */}
                <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold">{uploadLabel}</span>
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-pink-600 font-medium">{order.uploadId || "N/A"}</span>
                        {order.uploadId && (
                            <CopyButton
                                text={order.uploadId}
                                className="h-5 w-5 bg-background border shadow-sm"
                                title={`Copy ${uploadLabel}`}
                            />
                        )}
                    </div>
                </div>

                {/* Photo Order Specifics */}
                {!(props.type === 'bill-payment' || props.type === 'money-transfer') && (
                    <>
                        {/* Original File Name */}
                        <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold">Original File Name</span>
                            <div className="truncate max-w-[200px] font-medium text-foreground/80" title={order.originalFilename || "N/A"}>
                                {order.originalFilename || "N/A"}
                            </div>
                        </div>

                        {/* Description */}
                        <div className="flex flex-col gap-1 md:col-span-4">
                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold">Description</span>
                            <div className="bg-background border rounded-md p-2 text-xs max-h-[80px] overflow-y-auto font-mono text-foreground/90 whitespace-pre-wrap shadow-sm">
                                {order.description || <span className="text-muted-foreground italic">No instructions.</span>}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Imports needed at top of file, will handle via separate edit if needed or assume I can add them here if I replace the whole file?
// ReplaceFileContent replaces a block. I should ensure I import Badge and CopyButton.
// I will just do the replacement of the FUNCTION BODY and then add imports in a separate call or same call if range allows.
// Actually, I am replacing lines 90-163 (return block). I'll need to do the imports separately.
