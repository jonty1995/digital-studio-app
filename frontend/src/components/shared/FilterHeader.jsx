import { useState, useEffect } from "react";
import { PageHeader } from "./PageHeader";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Search } from "lucide-react";

export const useViewMode = (storageKey = "app-view-mode") => {
    const [viewMode, setViewMode] = useState(() => localStorage.getItem(storageKey) || "cozy");

    useEffect(() => {
        localStorage.setItem(storageKey, viewMode);
    }, [viewMode, storageKey]);

    return [viewMode, setViewMode];
};

export const FilterHeader = ({
    title,
    dateRange,
    onDateChange,
    searchQuery,
    onSearchChange,
    viewMode,
    onViewModeChange,
    action,
    children
}) => {
    // Initialize defaults on mount
    useEffect(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;

        if (!dateRange.start) onDateChange('start', today);
        if (!dateRange.end) onDateChange('end', today);
    }, []); // Run once on mount

    return (
        <PageHeader title={title}>
            <div className="flex flex-wrap gap-4 items-center">
                {/* Date Range */}
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        className="w-[140px] h-9"
                        value={dateRange.start || ''}
                        onChange={(e) => {
                            const newVal = e.target.value;
                            // Validate: If Start > End, push End to Start
                            if (dateRange.end && newVal > dateRange.end) {
                                onDateChange('end', newVal);
                            }
                            onDateChange('start', newVal);
                        }}
                        aria-label="Start Date"
                    />
                    <span className="text-sm font-medium text-muted-foreground">-</span>
                    <Input
                        type="date"
                        className="w-[140px] h-9"
                        value={dateRange.end || ''}
                        onChange={(e) => {
                            const newVal = e.target.value;
                            // Validate: If End < Start, ignore or push Start?
                            // User asked: "from date will be same or greater than to" -> Actually usually "From <= To".
                            // If user meant "From > To is invalid", then:
                            // If End is selected < Start, assume user wants to reset Start or block?
                            // Standard behavior: If End < Start, set Start = End.
                            if (dateRange.start && newVal < dateRange.start) {
                                onDateChange('start', newVal);
                            }
                            onDateChange('end', newVal);
                        }}
                        aria-label="End Date"
                    />
                </div>

                {/* Extra Filters (Children) */}
                {children && (
                    <div className="flex items-center gap-4 border-l pl-4 h-9">
                        {children}
                    </div>
                )}

                {/* Search */}
                <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        className="pl-9 h-9"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                {/* View Toggle */}
                {onViewModeChange && (
                    <div className="flex items-center gap-2 border-l pl-4 h-9">
                        <span className="text-sm font-medium text-muted-foreground mr-1">View:</span>
                        <span className={`text-xs ${viewMode === 'compact' ? 'font-bold' : 'text-muted-foreground'}`}>Compact</span>
                        <Switch
                            checked={viewMode === 'cozy'}
                            onCheckedChange={(c) => onViewModeChange(c ? 'cozy' : 'compact')}
                            className="scale-75"
                        />
                        <span className={`text-xs ${viewMode === 'cozy' ? 'font-bold' : 'text-muted-foreground'}`}>Cozy</span>
                    </div>
                )}

                {/* Action Button */}
                {action && (
                    <div className="ml-auto">
                        {action}
                    </div>
                )}
            </div>
        </PageHeader>
    );
};
