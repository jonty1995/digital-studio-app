import React, { useState, useEffect, useCallback } from "react";
import { FilterHeader } from "@/components/shared/FilterHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Plus, Folder, FileText, AlertTriangle, Edit2 } from "lucide-react";
import { serviceOrderService } from "@/services/serviceOrderService";
import { configurationService } from "@/services/configurationService"; // Import configurationService
import { ServiceOrderModal } from "@/components/shared/ServiceOrderModal";
import { OrderStatus } from "@/components/shared/OrderStatus";
import { StatusTimeline } from "@/components/shared/StatusTimeline";
import { FileThumbnail } from "@/components/shared/FileThumbnail";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export default function ServiceOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [viewMode, setViewMode] = useState("cozy");
    const [selectedId, setSelectedId] = useState(null);

    // Filters
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState([]); // Selected Services
    // Combined list of default + configured filters
    const [availableFilters, setAvailableFilters] = useState(["Online Application", "Photocopy", "Printing"]);

    // Modals
    const [editingOrder, setEditingOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "" });

    const showAlert = (title, message) => setAlertConfig({ isOpen: true, title, message });

    // Fetch configured services and merge with defaults
    useEffect(() => {
        const loadFilters = async () => {
            const configuredItems = await configurationService.getServiceItems();
            const configuredNames = configuredItems.map(i => i.name);
            setAvailableFilters(prev => {
                const unique = new Set([...prev, ...configuredNames]);
                return Array.from(unique);
            });
        };
        loadFilters();
    }, []);

    const fetchOrders = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const params = {
                page: page,
                size: 20,
                startDate: dateRange.start,
                endDate: dateRange.end,
                search: searchQuery,
                services: filters
            };
            const data = await serviceOrderService.getAll(params);
            const nextOrders = data.content || [];

            setOrders(prev => {
                const combined = page === 0 ? nextOrders : [...prev, ...nextOrders];
                const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                return unique;
            });

            setHasMore(!data.last && nextOrders.length > 0);
            setTotalItems(data.totalElements || 0);
        } catch (error) {
            console.error("Failed to fetch service orders:", error);
            if (!isBackground) showAlert("Error", "Failed to load service orders.");
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => { setPage(0); }, [dateRange, searchQuery, filters]);
    useEffect(() => { fetchOrders(); }, [page, dateRange, searchQuery, filters]);

    const handleSaved = async (payload, id = null) => {
        try {
            if (id) {
                await serviceOrderService.update(id, payload);
                showAlert("Success", "Service request updated successfully.");
            } else {
                await serviceOrderService.create(payload);
                showAlert("Success", "Service request created successfully.");
            }
            fetchOrders(true);
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to save service request.");
        }
    };
    const pClass = viewMode === "compact" ? "py-1 px-2 text-xs" : "py-3 px-4 text-sm";

    return (
        <div className="flex flex-col h-full bg-background">
            <FilterHeader
                title="Service Requests"
                dateRange={dateRange}
                onDateChange={(t, v) => setDateRange(prev => t === 'range' ? v : { ...prev, [t]: v })}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                action={
                    <Button size="sm" className="h-9 shadow-sm" onClick={() => setIsModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Service
                    </Button>
                }
            >
                <div className="flex items-center gap-4 flex-wrap">
                    {availableFilters.map(s => (
                        <label key={s} className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors">
                            <input
                                type="checkbox"
                                checked={filters.includes(s)}
                                onChange={() => {
                                    setFilters(prev => prev.includes(s) ? prev.filter(f => f !== s) : [...prev, s]);
                                }}
                                className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary"
                            />
                            {s}
                        </label>
                    ))}
                </div>
            </FilterHeader>

            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[100px]">Date</TableHead>
                            <TableHead className="w-[120px]">ID</TableHead>
                            <TableHead className="w-[150px]">Service</TableHead>
                            <TableHead className="min-w-[200px]">Description</TableHead>
                            <TableHead className="w-[180px]">Files</TableHead>
                            <TableHead className="w-[100px]">Amount</TableHead>
                            <TableHead className="w-[130px]">Status</TableHead>
                            <TableHead className="w-[80px]">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.length === 0 && !loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No service requests found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.map((o) => {
                                const isExpanded = selectedId === o.id;
                                return (
                                    <React.Fragment key={o.id}>
                                        <TableRow
                                            className={`group transition-colors ${isExpanded ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted/30 border-l-4 border-l-transparent'}`}
                                        >
                                            <TableCell className={`${pClass} align-top font-medium`} onClick={() => setSelectedId(isExpanded ? null : o.id)}>{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className={`${pClass} align-top font-semibold text-foreground`} onClick={() => setSelectedId(isExpanded ? null : o.id)}>
                                                {o.customer?.mobile}
                                            </TableCell>
                                            <TableCell className={`${pClass} align-top`} onClick={() => setSelectedId(isExpanded ? null : o.id)}>
                                                <Badge variant="secondary" className="whitespace-nowrap">{o.serviceName}</Badge>
                                            </TableCell>
                                            <TableCell className={`${pClass} align-top`}>
                                                <textarea
                                                    readOnly
                                                    className="w-full h-12 text-xs bg-transparent border-none resize-none focus:ring-0 custom-scrollbar overscroll-contain cursor-default"
                                                    value={o.description || "No description"}
                                                />
                                            </TableCell>
                                            <TableCell className={`${pClass} align-top`} onClick={() => setSelectedId(isExpanded ? null : o.id)}>
                                                <div className="flex flex-wrap gap-1">
                                                    {o.uploadIdsJson ? JSON.parse(o.uploadIdsJson).slice(0, 3).map((id, idx) => (
                                                        <div key={idx} className="flex flex-col items-center gap-0.5">
                                                            <FileThumbnail
                                                                fileId={id}
                                                                isPdf={id.toLowerCase().endsWith('.pdf')}
                                                                containerClass="w-8 h-8"
                                                                iconClass="w-4 h-4 text-red-500"
                                                                onView={(fid) => window.open(`/api/files/${fid}`, '_blank')}
                                                            />
                                                            <span className="text-[9px] font-mono font-medium text-muted-foreground truncate w-8 text-center" title={id.split('.')[0]}>
                                                                {id.split('.')[0]}
                                                            </span>
                                                        </div>
                                                    )) : <span className="text-xs text-muted-foreground italic">None</span>}
                                                    {o.uploadIdsJson && JSON.parse(o.uploadIdsJson).length > 3 && (
                                                        <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center text-[10px] font-bold">
                                                            +{JSON.parse(o.uploadIdsJson).length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className={`${pClass} align-top font-bold text-primary`} onClick={() => setSelectedId(isExpanded ? null : o.id)}>
                                                ₹{o.amount?.toFixed(2)}
                                            </TableCell>
                                            <TableCell className={`${pClass} align-top`} onClick={() => setSelectedId(isExpanded ? null : o.id)}>
                                                <OrderStatus order={o} type="service-order" updateFn={serviceOrderService.updateStatus} onUpdate={() => fetchOrders(true)} />
                                            </TableCell>
                                            <TableCell className={`${pClass} align-top`}>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary disabled:opacity-30"
                                                    disabled={o.status !== 'Pending'}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingOrder(o);
                                                        setIsModalOpen(true);
                                                    }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {isExpanded && (
                                            <TableRow className="bg-muted/30 border-b animate-in fade-in zoom-in-95 duration-200">
                                                <TableCell colSpan={8} className="p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <StatusTimeline order={o} type="service-order" />
                                                        <div className="space-y-4">
                                                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                                <Folder className="w-4 h-4" /> Documents
                                                            </h3>
                                                            {o.uploadIdsJson ? (
                                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                                    {JSON.parse(o.uploadIdsJson).map((id, idx) => {
                                                                        const isAvailable = o.isFileAvailable ? o.isFileAvailable[id] : true;
                                                                        return (
                                                                            <div key={idx} className="flex flex-col items-center gap-2">
                                                                                <FileThumbnail
                                                                                    fileId={id}
                                                                                    isFileAvailable={isAvailable}
                                                                                    isPdf={id.toLowerCase().endsWith('.pdf')}
                                                                                    containerClass="w-full h-16"
                                                                                    iconClass="w-8 h-8 text-red-500"
                                                                                    onView={(fid) => window.open(`/api/files/${fid}`, '_blank')}
                                                                                    onDownload={(fid) => {
                                                                                        const a = document.createElement('a');
                                                                                        a.href = `/api/files/${fid}`;
                                                                                        a.download = fid;
                                                                                        a.click();
                                                                                    }}
                                                                                />
                                                                                <span className="text-[10px] font-mono font-medium text-muted-foreground truncate w-full text-center">
                                                                                    {id.split('.')[0]}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-muted-foreground italic">No documents uploaded.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                        {loading && page > 0 && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={6} className="py-4 text-center">
                                    <div className="text-sm text-muted-foreground animate-pulse">Loading more...</div>
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && hasMore && (
                            <TableRow onClick={() => setPage(p => p + 1)} className="cursor-pointer hover:bg-primary/5 group">
                                <TableCell colSpan={6} className="py-4 text-center text-sm font-medium text-primary group-hover:underline">
                                    Load more service records
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <ServiceOrderModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingOrder(null);
                }}
                onSave={handleSaved}
                order={editingOrder}
            />

            <SimpleAlert
                open={alertConfig.isOpen}
                onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, isOpen: open }))}
                title={alertConfig.title}
                description={alertConfig.message}
            />
        </div >
    );
}
