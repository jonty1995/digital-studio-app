import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, Eye, Minimize2, Maximize2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, addDays } from 'date-fns';

export function DeleteQueueWidget({ onView, refreshTrigger }) {
    const [queue, setQueue] = useState([]);
    const [isMinimized, setIsMinimized] = useState(false);
    const [configDays, setConfigDays] = useState(null);

    useEffect(() => {
        refreshData();

        // Poll every 30 seconds to keep sync with backend changes
        const interval = setInterval(refreshData, 30000);
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    const refreshData = () => {
        fetchQueue();
        fetchConfig();
    };

    const fetchQueue = async () => {
        try {
            const res = await fetch('/api/files/queue');
            if (res.ok) {
                const data = await res.json();
                setQueue(data);
            }
        } catch (error) {
            console.error("Failed to fetch delete queue", error);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/config/values");
            if (res.ok) {
                const data = await res.json();
                // data is array of { name, value, ... }
                const configItem = data.find(item => item.name === "FILE_ABSOLUTE_DELETE_DAYS");

                if (configItem && configItem.value && !isNaN(parseInt(configItem.value))) {
                    setConfigDays(parseInt(configItem.value));
                }
            }
        } catch (error) {
            // Error handling - keep null to indicate failure/loading
        }
    };

    const calculateDaysLeft = (softDeleteTime) => {
        if (configDays === null) return '...';

        const days = configDays;
        const deleteDate = addDays(new Date(softDeleteTime), days);
        const diffMs = deleteDate.getTime() - new Date().getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(0, daysLeft);
    };

    if (queue.length === 0) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-50 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg shadow-xl transition-all duration-300 w-96 flex flex-col ${isMinimized ? 'h-auto' : 'max-h-[400px]'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-amber-200 dark:border-amber-900 bg-amber-100/50 dark:bg-amber-900/50 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-amber-700 dark:text-amber-500" />
                    <span className="font-semibold text-sm text-amber-900 dark:text-amber-100">Delete Queue</span>
                    <Badge variant="outline" className="text-xs px-1.5 h-5 border-amber-300 text-amber-800 dark:text-amber-300">{queue.length}</Badge>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-amber-200/50 hover:text-amber-900 dark:hover:bg-amber-800/50 dark:text-amber-400" onClick={() => setIsMinimized(!isMinimized)}>
                        {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Content */}
            {!isMinimized && (
                <div className="overflow-y-auto p-2 space-y-2 max-h-[300px] scrollbar-thin">
                    {queue.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Queue is empty.</p>
                    ) : (
                        queue.map((item) => (
                            <div key={item.id} className="flex flex-col p-2 bg-white/60 dark:bg-black/20 border border-amber-100 dark:border-amber-900/50 rounded-md shadow-sm hover:shadow-md transition-all group gap-2 hover:bg-white/80 dark:hover:bg-black/30">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-medium truncate w-[140px] text-amber-950 dark:text-amber-100" title={item.uploadId}>
                                        {item.uploadId}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] h-5 px-1 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
                                        {item.source}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[10px] text-amber-800/80 dark:text-amber-300/80">
                                        <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-medium border border-amber-200 dark:border-amber-800">
                                            {calculateDaysLeft(item.softDeleteTime)} days left
                                        </span>
                                        <span>
                                            Del: {item.softDeleteTime ? format(new Date(item.softDeleteTime), "dd MMM") : '-'}
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 text-xs gap-1 px-2 hover:bg-amber-200/50 dark:hover:bg-amber-800/50 text-amber-900 dark:text-amber-200"
                                        onClick={() => onView(item.uploadId)}
                                    >
                                        <Eye className="w-3 h-3" />
                                        View
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
