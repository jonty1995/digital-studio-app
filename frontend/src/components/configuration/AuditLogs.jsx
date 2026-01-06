import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { configurationService } from "@/services/configurationService";
import { Loader2, ArrowUpDown, Filter, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    // Set default range: Start = 30 days ago, End = Today
    const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

    const [selectedModules, setSelectedModules] = useState([]);

    const modules = [
        { id: "PhotoItem", label: "Photo Items" },
        { id: "Addon", label: "Addons" },
        { id: "PricingRule", label: "Pricing Rules" },
        { id: "ValueConfiguration", label: "Values" },
    ];

    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: "timestamp", direction: "desc" });

    useEffect(() => {
        fetchLogs();
    }, [startDate, endDate, selectedModules]); // Auto-refresh on filter change

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Construct query params
            const params = new URLSearchParams();
            params.append("startDate", new Date(startDate + "T00:00:00").toISOString());
            params.append("endDate", new Date(endDate + "T23:59:59").toISOString());

            if (selectedModules.length > 0) {
                selectedModules.forEach(m => params.append("entityTypes", m));
            } else {
                params.append("entityTypes", "All");
            }

            const data = await configurationService.getAuditLogs(params);
            setLogs(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleModule = (id) => {
        if (selectedModules.includes(id)) {
            setSelectedModules(selectedModules.filter(m => m !== id));
        } else {
            setSelectedModules([...selectedModules, id]);
        }
    };

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const sortedLogs = [...logs].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
    });

    const getActionColor = (action) => {
        switch (action) {
            case "CREATE": return "bg-green-100 text-green-800 border-green-200";
            case "UPDATE": return "bg-blue-100 text-blue-800 border-blue-200";
            case "DELETE": return "bg-red-100 text-red-800 border-red-200";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
                {/* Date Range Inputs similar to screenshot */}
                <div className="flex items-center gap-2">
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-[150px] bg-white"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-[150px] bg-white"
                    />
                </div>

                <div className="h-6 w-px bg-border mx-2" />

                {/* Filter Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2 bg-white">
                            <Filter className="w-4 h-4" />
                            Filters
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm px-2 py-1.5 text-muted-foreground">Filter by Module</h4>
                            <div className="space-y-1">
                                {modules.map(module => (
                                    <div
                                        key={module.id}
                                        className="flex items-center space-x-2 px-2 py-1.5 hover:bg-muted/50 rounded-sm cursor-pointer"
                                        onClick={() => toggleModule(module.id)}
                                    >
                                        <div className={`h-4 w-4 rounded border flex items-center justify-center ${selectedModules.includes(module.id) ? "bg-primary border-primary text-primary-foreground" : "border-input"}`}>
                                            {selectedModules.includes(module.id) && <Check className="w-3 h-3" />}
                                        </div>
                                        <span className="text-sm">{module.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-2 border-t mt-2 px-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => setSelectedModules([])}
                                >
                                    Clear Filters
                                </Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-auto" />}
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[180px] cursor-pointer" onClick={() => handleSort("timestamp")}>
                                Timestamp <ArrowUpDown className="w-4 h-4 inline ml-1" />
                            </TableHead>
                            <TableHead className="w-[120px] cursor-pointer" onClick={() => handleSort("action")}>
                                Action <ArrowUpDown className="w-4 h-4 inline ml-1" />
                            </TableHead>
                            <TableHead className="w-[150px] cursor-pointer" onClick={() => handleSort("entityName")}>
                                Module <ArrowUpDown className="w-4 h-4 inline ml-1" />
                            </TableHead>
                            <TableHead>Changes</TableHead>
                            <TableHead className="w-[120px]">User</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No audit logs found for the selected criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs">
                                        {format(new Date(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={getActionColor(log.action)}>
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{log.entityName}</span>
                                        <div className="text-xs text-muted-foreground truncate max-w-[140px]" title={log.entityId}>
                                            ID: {log.entityId}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {log.fieldName ? (
                                            <div className="grid gap-1">
                                                <div className="font-medium">
                                                    Field: <span className="text-primary">{log.fieldName}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-muted/50 p-2 rounded">
                                                    <div className="text-destructive line-through opacity-70">
                                                        {log.oldValue || "(null)"}
                                                    </div>
                                                    <div className="text-green-600 font-semibold">
                                                        {log.newValue || "(null)"}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-muted-foreground italic">
                                                {log.action === "DELETE" ? (
                                                    <span>Deleted item: {log.oldValue}</span>
                                                ) : (
                                                    <span>{log.action === "CREATE" ? `Created: ${log.newValue}` : "Modified"}</span>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>{log.modifiedBy}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
