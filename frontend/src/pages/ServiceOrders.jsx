import React, { useState, useEffect, useRef, useCallback } from "react";
import { FilterHeader, useViewMode } from "@/components/shared/FilterHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Plus, Folder, FileText, AlertTriangle, Edit2, Filter, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { serviceOrderService } from "@/services/serviceOrderService";
import { configurationService } from "@/services/configurationService";
import { ServiceOrderModal } from "@/components/shared/ServiceOrderModal";
import { OrderStatus } from "@/components/shared/OrderStatus";
import { StatusTimeline } from "@/components/shared/StatusTimeline";
import { FileThumbnail } from "@/components/shared/FileThumbnail";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { DateUtils } from "@/utils/DateUtils";
import { CopyButton } from "@/components/shared/CopyButton";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/services/api";

const stripHtml = (html) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
};

export default function ServiceOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [scrollBlockSize, setScrollBlockSize] = useState(20);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    // View Mode from Hook
    const [viewMode, setViewMode] = useViewMode("service-order-view-mode");

    // Filters
    const [dateRange, setDateRange] = useState(() => {
        const today = DateUtils.formatForInput(new Date());
        return { start: today, end: today };
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState([]); // Selected Services
    const [availableFilters, setAvailableFilters] = useState([]);

    // AbortController Ref
    const abortControllerRef = useRef(null);
    const observer = useRef();

    // Modals
    const [editingOrder, setEditingOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "" });

    const showAlert = (title, message) => setAlertConfig({ isOpen: true, title, message });

    // Fetch configured services
    useEffect(() => {
        const loadFilters = async () => {
            const configuredItems = await configurationService.getServiceItems();
            setAvailableFilters(configuredItems.map(i => i.name));
        };
        loadFilters();
    }, []);

    useEffect(() => {
        const fetchBlockSize = async () => {
            try {
                const values = await configurationService.getValues();
                const blockSizeConfig = values.find(v => v.name === "SCROLL_BLOCK_SIZE");
                if (blockSizeConfig?.value) setScrollBlockSize(parseInt(blockSizeConfig.value));
            } catch (e) { console.error(e); }
        };
        fetchBlockSize();
    }, []);

    const fetchOrders = async (pageNum = page, isReset = false, isBackground = false) => {
        if (!isBackground) setLoading(true);

        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const params = {
                page: pageNum,
                size: scrollBlockSize,
                startDate: searchQuery ? "" : dateRange.start,
                endDate: searchQuery ? "" : dateRange.end,
                search: searchQuery,
                services: searchQuery ? [] : filters
            };
            const data = await serviceOrderService.getAll(params, controller.signal);
            const nextOrders = data.content || [];

            setOrders(prev => {
                const combined = isReset || pageNum === 0 ? nextOrders : [...prev, ...nextOrders];
                return Array.from(new Map(combined.map(item => [item.id, item])).values());
            });

            if (isReset || pageNum === 0) setPage(0);
            setHasMore(!data.last && nextOrders.length > 0);
            setTotalItems(data.totalElements || 0);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error(error);
            if (!isBackground) showAlert("Error", "Failed to load service orders.");
        } finally {
            if (!isBackground && abortControllerRef.current === controller) setLoading(false);
        }
    };

    useEffect(() => { setPage(0); }, [dateRange, searchQuery, filters]);
    useEffect(() => { fetchOrders(); }, [page, dateRange, searchQuery, filters, scrollBlockSize]);

    const handleSaved = async (payload, id = null) => {
        try {
            if (id) {
                await serviceOrderService.update(id, payload);
                showAlert("Success", "Service request updated successfully.");
            } else {
                await serviceOrderService.create(payload);
                showAlert("Success", "Service request created successfully.");
            }
            await fetchOrders(0, true);
            setIsModalOpen(false);
            setEditingOrder(null);
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to save service request.");
        }
    };

    const lastOrderElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) setPage(p => p + 1);
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const handleDateChange = (type, value) => {
        if (type === 'range') { setDateRange(value); return; }
        setDateRange(prev => {
            const newRange = { ...prev, [type]: value };
            if (newRange.start && newRange.end && newRange.start > newRange.end) {
                return type === 'start' ? { start: value, end: value } : { start: value, end: value };
            }
            return newRange;
        });
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <FilterHeader
                title="Service Requests"
                dateRange={dateRange}
                onDateChange={handleDateChange}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                action={
                    <Button size="sm" className="h-9 shadow-sm" onClick={() => { setEditingOrder(null); setIsModalOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Service
                    </Button>
                }
            >
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-primary">
                            <Filter className="h-4 w-4" />
                            {filters.length > 0 ? `${filters.length} Selected` : 'All Services'}
                            {filters.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{filters.length}</Badge>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-4" align="start">
                        <div className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground pb-2 border-b">Filter by Service</h4>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {availableFilters.map(s => (
                                    <label key={s} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={filters.includes(s)}
                                            onChange={() => setFilters(prev => prev.includes(s) ? prev.filter(f => f !== s) : [...prev, s])}
                                            className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary"
                                        />
                                        <span className="truncate" title={s}>{s}</span>
                                    </label>
                                ))}
                                {availableFilters.length === 0 && <p className="text-xs text-muted-foreground italic">No services configured.</p>}
                            </div>
                            {filters.length > 0 && (
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setFilters([])}>Clear all</Button>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </FilterHeader>

            <div className="flex-1 p-6 pt-0 flex flex-col min-h-0">
                <div className="rounded-md border bg-card flex-1 flex flex-col min-h-0">
                    <Table containerClassName="flex-1 overflow-auto h-full">
                        <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                            <TableRow>
                                <TableHead className={`w-[130px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Date</TableHead>
                                <TableHead className={`w-[140px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Customer ID</TableHead>
                                <TableHead className={`w-[150px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Service</TableHead>
                                <TableHead className={`font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Description</TableHead>
                                <TableHead className={`w-[140px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Files</TableHead>
                                <TableHead className={`w-[90px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Total</TableHead>
                                <TableHead className={`w-[90px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Adv</TableHead>
                                <TableHead className={`w-[90px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Due</TableHead>
                                <TableHead className={`w-[140px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Status</TableHead>
                                <TableHead className={`w-[80px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && page === 0 ? (
                                <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground">Loading...</TableCell></TableRow>
                            ) : orders.length === 0 && !loading ? (
                                <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground">No service requests found.</TableCell></TableRow>
                            ) : (
                                orders.map((o, index) => {
                                    const pClass = viewMode === 'compact' ? 'p-2' : 'p-4';
                                    const hClass = viewMode === 'compact' ? 'h-10' : '';
                                    const isExpanded = expandedOrderId === o.id;

                                    return (
                                        <React.Fragment key={o.id}>
                                            <TableRow
                                                ref={index === orders.length - 1 ? lastOrderElementRef : null}
                                                className={cn(
                                                    "cursor-pointer border-b transition-colors outline-none focus:bg-blue-50/50",
                                                    hClass,
                                                    isExpanded ? "bg-muted/50" : "hover:bg-gray-100/60",
                                                    selectedOrderId === o.id ? "bg-blue-50/30" : ""
                                                )}
                                                onClick={() => setExpandedOrderId(isExpanded ? null : o.id)}
                                            >
                                                <TableCell className={`${pClass} align-middle text-xs whitespace-nowrap`}>{DateUtils.format(o.createdAt)}</TableCell>
                                                <TableCell className={`${pClass} align-middle`}>
                                                    <div className="flex items-center gap-1 group/cid">
                                                        <span className="font-medium">{o.customer?.mobile || "-"}</span>
                                                        {o.customer?.mobile && <CopyButton text={o.customer.mobile} className="h-4 w-4 opacity-0 group-hover/cid:opacity-100 transition-opacity" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle`}><Badge variant="outline">{o.serviceName}</Badge></TableCell>
                                                <TableCell className={`${pClass} align-middle`}>
                                                    <div className="max-w-[200px] truncate text-xs text-muted-foreground" title={stripHtml(o.description)}>
                                                        {stripHtml(o.description) || "No description"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle`}>
                                                    <div className="flex -space-x-2 overflow-hidden">
                                                        {o.uploadIdsJson && JSON.parse(o.uploadIdsJson).slice(0, 3).map((id, idx) => (
                                                            <div key={idx} className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-muted">
                                                                <FileThumbnail fileId={id} isPdf={id.toLowerCase().endsWith('.pdf')} containerClass="w-full h-full rounded-full" iconClass="w-3 h-3" hideLabel />
                                                            </div>
                                                        ))}
                                                        {o.uploadIdsJson && JSON.parse(o.uploadIdsJson).length > 3 && (
                                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[8px] font-bold ring-2 ring-background">
                                                                +{JSON.parse(o.uploadIdsJson).length - 3}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle font-medium`}>₹{(o.payment?.totalAmount || o.amount || 0).toFixed(2)}</TableCell>
                                                <TableCell className={`${pClass} align-middle text-emerald-600`}>₹{(o.payment?.advanceAmount || 0).toFixed(2)}</TableCell>
                                                <TableCell className={`${pClass} align-middle font-semibold text-red-600`}>
                                                    ₹{(o.payment?.dueAmount || Math.max(0, (o.payment?.totalAmount || o.amount || 0) - (o.payment?.advanceAmount || 0))).toFixed(2)}
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle`}>
                                                    <OrderStatus order={o} type="service-order" updateFn={serviceOrderService.updateStatus} onUpdate={() => fetchOrders(page, true, true)} />
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle`}>
                                                    {(o.status === 'Pending' || o.status === 'Discarded' || o.status === 'Cancelled') && (
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary rounded-full" onClick={(e) => { e.stopPropagation(); setEditingOrder(o); setIsModalOpen(true); }}>
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded && (
                                                <TableRow className="bg-muted/30 border-b animate-in fade-in zoom-in-95 duration-200">
                                                    <TableCell colSpan={10} className="p-4">
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                            <div className="space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Service Details</h3>
                                                                    <Badge variant="outline" className="text-[10px] uppercase">{o.status}</Badge>
                                                                </div>
                                                                 <div className="bg-background rounded-lg p-3 border shadow-sm prose prose-sm max-w-none min-h-[60px]">
                                                                     {o.description ? (
                                                                         <div className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: o.description }} />
                                                                     ) : (
                                                                         <p className="text-xs text-muted-foreground italic">No description provided.</p>
                                                                     )}
                                                                 </div>
                                                                <div className="space-y-2">
                                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                                                        <Folder className="w-3 h-3" /> Attached Files ({o.uploadIdsJson ? JSON.parse(o.uploadIdsJson).length : 0})
                                                                    </h4>
                                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                        {o.uploadIdsJson && JSON.parse(o.uploadIdsJson).map((id, idx) => (
                                                                            <FileThumbnail
                                                                                key={idx}
                                                                                fileId={id}
                                                                                isPdf={id.toLowerCase().endsWith('.pdf')}
                                                                                containerClass="h-16 w-full rounded-md border"
                                                                                onView={(fid) => window.open(`${API_BASE_URL}/files/${fid}`, '_blank')}
                                                                                onDownload={(fid) => {
                                                                                    const a = document.createElement('a');
                                                                                    a.href = `${API_BASE_URL}/files/${fid}`;
                                                                                    a.download = fid;
                                                                                    a.click();
                                                                                }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-4">
                                                                <h3 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Activity History</h3>
                                                                <div className="bg-background rounded-lg p-3 border shadow-sm max-h-[300px] overflow-auto custom-scrollbar">
                                                                    <StatusTimeline order={o} type="service-order" />
                                                                </div>
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
                                    <TableCell colSpan={10} className="py-4 text-center">
                                        <div className="text-sm text-muted-foreground animate-pulse flex items-center justify-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Loading more...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <ServiceOrderModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingOrder(null); }} onSave={handleSaved} order={editingOrder} />
            <SimpleAlert open={alertConfig.isOpen} onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, isOpen: open }))} title={alertConfig.title} description={alertConfig.message} />
        </div>
    );
}
