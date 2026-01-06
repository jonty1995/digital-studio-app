import { useState, useEffect } from "react";
import { PageHeader } from "./PageHeader";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Search, X } from "lucide-react";
import { configurationService } from "@/services/configurationService";
import { format } from "date-fns";

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
    // Determine default date range from config on mount
    useEffect(() => {
        const loadConfig = async () => {
            const values = await configurationService.getValues();
            const rangeConfig = values.find(v => v.name === "DATE_RANGE");
            if (rangeConfig && rangeConfig.value) {
                const days = parseInt(rangeConfig.value, 10);
                if (!isNaN(days) && days > 0) {
                    const d = new Date();
                    const end = format(d, 'yyyy-MM-dd');
                    d.setDate(d.getDate() - (days - 1));
                    const start = format(d, 'yyyy-MM-dd');

                    // Call handler with special 'range' type or both
                    if (onDateChange) {
                        // Assuming onDateChange can handle custom updates or we add support
                        // We'll treat 'start' and 'end' updates sequentially or support a bulk update convention
                        // Let's propose sending 'range' as key
                        onDateChange('range', { start, end });
                    }
                }
            }
        };
        // Only run if we aren't already set to something custom?
        // Ideally we only run this once on mount.
        loadConfig();
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
                        className="pl-9 pr-8 h-9"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange("")}
                            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
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
