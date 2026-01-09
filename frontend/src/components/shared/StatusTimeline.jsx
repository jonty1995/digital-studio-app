import React from 'react';
import { format } from 'date-fns';
import { ClipboardList, Package, Truck, Home, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";

export function StatusTimeline({ order }) {
    const isInstant = order.isInstant;
    const currentStatus = order.status;
    const history = order.statusHistoryJson ? JSON.parse(order.statusHistoryJson) : [];

    // Construct the Ideal Flow
    let steps = [];
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

    // Special Case: Discard (Replace the rest of the flow or show as terminal?)
    // If currently Discarded, we might want to show Pending -> Discarded
    // If currently Discard, we might want to show Pending -> Discard
    if (currentStatus === 'Discard' || currentStatus === 'Discarded') {
        steps = [
            { id: 'Pending', label: 'Pending', icon: ClipboardList },
            { id: 'Discard', label: 'Discard', icon: Trash2, isDestructive: true },
        ];
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
        const isPast = currentIndex > thisIndex;

        let timestamp = entry ? entry.timestamp : null;

        // Fallback for Pending: If no explicit history, use createdAt
        if (stepId === 'Pending' && !timestamp && order.createdAt) {
            timestamp = order.createdAt;
        }

        const isCompleted = isActive || isPast;

        return {
            timestamp: isCompleted ? timestamp : null, // Only show timestamp if step is actually completed/active in current flow
            isActive,
            isCompleted
        };
    };

    return (
        <div className="w-full py-4 overflow-x-auto">
            <div className="flex items-start justify-between relative min-w-[600px]">
                {/* Connecting Line - Background */}
                <div className="absolute top-4 left-0 w-full h-1 bg-gray-200 rounded -z-0"></div>

                {/* Active Line (Progress) */}
                {/* Difficult to calculate exact width dynamically without refs, 
                    but we can color individual segments between steps if we refactor HTML structure. 
                    For now, simple approach: The line is gray, dots are colored. */}

                {steps.map((step, index) => {
                    const { timestamp, isActive, isCompleted } = getStepInfo(step.id);
                    const isLast = index === steps.length - 1;
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
                            {/* Connector Line Coloring - If previous step completed & this step completed/active, color the line to the left? 
                                 CSS Only solution: Use :before/after on the dots to cover the gray line. */}

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
    );
}
