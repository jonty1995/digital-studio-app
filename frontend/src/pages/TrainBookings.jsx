import React, { useState, useEffect, useRef, useCallback } from "react";
import { FilterHeader, useViewMode } from "@/components/shared/FilterHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { stationService } from "@/services/stationService";
import { trainListService } from "@/services/trainListService";
import { clearStationCache } from "@/components/shared/StationSearch";
import { clearTrainCache } from "@/components/shared/TrainSearch";
import { RefreshCw, Eye, Download, Plus, Folder, FileText, AlertTriangle, Edit2, Loader2, Train } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trainBookingService } from "@/services/trainBookingService";
import { configurationService } from "@/services/configurationService";
import { TrainBookingModal } from "@/components/shared/TrainBookingModal";
import { OrderStatus } from "@/components/shared/OrderStatus";
import { StatusTimeline } from "@/components/shared/StatusTimeline";
import { FileThumbnail } from "@/components/shared/FileThumbnail";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { DateUtils } from "@/utils/DateUtils";
import { CopyButton } from "@/components/shared/CopyButton";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/services/api";

export default function TrainBookings() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [scrollBlockSize, setScrollBlockSize] = useState(20);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    const [viewMode, setViewMode] = useViewMode("train-booking-view-mode");

    const [dateRange, setDateRange] = useState(() => {
        const today = DateUtils.formatForInput(new Date());
        return { start: today, end: today };
    });
    const [searchQuery, setSearchQuery] = useState("");

    const abortControllerRef = useRef(null);
    const observer = useRef();

    const [editingOrder, setEditingOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "" });

    const showAlert = (title, message) => setAlertConfig({ isOpen: true, title, message });

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
                search: searchQuery
            };
            const data = await trainBookingService.getAll(params, controller.signal);
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
            if (!isBackground) showAlert("Error", "Failed to load train bookings.");
        } finally {
            if (!isBackground && abortControllerRef.current === controller) setLoading(false);
        }
    };

    useEffect(() => { setPage(0); }, [dateRange, searchQuery]);
    useEffect(() => { fetchOrders(); }, [page, dateRange, searchQuery, scrollBlockSize]);

    const handleSaved = async (payload, id = null) => {
        try {
            if (id) {
                await trainBookingService.update(id, payload);
                showAlert("Success", "Booking updated successfully.");
            } else {
                await trainBookingService.create(payload);
                showAlert("Success", "Booking created successfully.");
            }
            await fetchOrders(0, true);
            setIsModalOpen(false);
            setEditingOrder(null);
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to save booking.");
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
                title="Train Bookings"
                dateRange={dateRange}
                onDateChange={handleDateChange}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                action={
                    <div className="flex items-center gap-2">
                        {user?.role === 'ADMIN' && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 shadow-sm gap-2" 
                                onClick={async () => {
                                    setRefreshing(true);
                                    try {
                                        await Promise.all([
                                            stationService.refresh(),
                                            trainListService.refresh()
                                        ]);
                                        clearStationCache();
                                        clearTrainCache();
                                        showAlert("Success", "Station and Train data refreshed successfully.");
                                    } catch (e) {
                                        console.error(e);
                                        showAlert("Error", "Failed to refresh data: " + (e.response?.data?.error || e.message));
                                    } finally {
                                        setRefreshing(false);
                                    }
                                }}
                                disabled={refreshing}
                            >
                                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                                {refreshing ? "Refreshing..." : "Refresh Data"}
                            </Button>
                        )}
                        <Button size="sm" className="h-9 shadow-sm" onClick={() => { setEditingOrder(null); setIsModalOpen(true); }}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Booking
                        </Button>
                    </div>
                }
            />

            <div className="flex-1 p-6 pt-0 flex flex-col min-h-0">
                <div className="rounded-md border bg-card flex-1 flex flex-col min-h-0">
                    <Table containerClassName="flex-1 overflow-auto h-full">
                        <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                            <TableRow>
                                <TableHead className={`w-[130px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Journey Date</TableHead>
                                <TableHead className={`w-[140px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Customer</TableHead>
                                <TableHead className={`w-[120px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>PNR</TableHead>
                                <TableHead className={`font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Train</TableHead>
                                <TableHead className={`w-[180px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Route</TableHead>
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
                                <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground">No train bookings found.</TableCell></TableRow>
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
                                                <TableCell className={`${pClass} align-middle text-xs whitespace-nowrap font-medium`}>
                                                    {o.journeyDate ? DateUtils.format(o.journeyDate) : "TBD"}
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle`}>
                                                    <div className="flex flex-col gap-0.5 group/cid">
                                                        <span className="font-medium text-xs">{o.customer?.name || "Unknown"}</span>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-muted-foreground">{o.customer?.mobile || "-"}</span>
                                                            {o.customer?.mobile && <CopyButton text={o.customer.mobile} className="h-3 w-3 opacity-0 group-hover/cid:opacity-100 transition-opacity" />}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle`}>
                                                    <div className="flex items-center gap-1 group/pnr">
                                                        <code className="text-xs font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded">{o.pnr || "N/A"}</code>
                                                        {o.pnr && <CopyButton text={o.pnr} className="h-3.5 w-3.5 opacity-0 group-hover/pnr:opacity-100 transition-opacity" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle`}>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold truncate max-w-[120px]" title={o.trainName}>{o.trainName || "N/A"}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            #{o.trainNumber || "N/A"} • {o.travelClass} 
                                                            {o.quota && <Badge variant="secondary" className="ml-1 px-1 h-3.5 text-[8px] leading-none">{o.quota}</Badge>}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle`}>
                                                    <div className="flex items-center gap-1.5 text-[10px]">
                                                        <span className="font-bold truncate max-w-[70px]" title={o.fromStation}>{o.fromStation || "???"}</span>
                                                        <div className="flex-1 h-[1px] bg-muted relative">
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                                                <Train className="w-2.5 h-2.5 text-muted-foreground" />
                                                            </div>
                                                        </div>
                                                        <span className="font-bold truncate max-w-[70px]" title={o.toStation}>{o.toStation || "???"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle font-medium`}>₹{(o.payment?.totalAmount || o.amount || 0).toFixed(2)}</TableCell>
                                                <TableCell className={`${pClass} align-middle text-emerald-600`}>₹{(o.payment?.advanceAmount || 0).toFixed(2)}</TableCell>
                                                <TableCell className={`${pClass} align-middle font-semibold text-red-600`}>
                                                    ₹{(o.payment?.dueAmount || 0).toFixed(2)}
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle`}>
                                                    <OrderStatus order={o} type="train-booking" updateFn={trainBookingService.updateStatus} onUpdate={() => fetchOrders(page, true, true)} />
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
                                                                    <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Booking Details</h3>
                                                                    <Badge variant="outline" className="text-[10px] uppercase">{o.status}</Badge>
                                                                </div>
                                                                <div className="bg-background rounded-lg p-3 border shadow-sm space-y-3">
                                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                                        <div className="col-span-2">
                                                                            <span className="text-muted-foreground block mb-1">Passengers:</span>
                                                                            <div className="space-y-1">
                                                                                {(() => {
                                                                                    try {
                                                                                        const ps = o.passengersJson ? JSON.parse(o.passengersJson) : [];
                                                                                        return ps.map((p, i) => (
                                                                                            <div key={i} className="flex justify-between items-center bg-muted/30 p-1.5 rounded border border-muted text-[11px]">
                                                                                                <span className="font-medium">{p.name} ({p.age}, {p.gender[0]})</span>
                                                                                                <span className="text-muted-foreground text-[10px] italic">{p.berth} | {p.food}</span>
                                                                                            </div>
                                                                                        ));
                                                                                    } catch (e) { return <span>{o.passengerNames || "N/A"}</span>; }
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-[10px]">
                                                                            <div>
                                                                                <span className="text-muted-foreground block font-bold mb-1">Contact Details:</span>
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <span><span className="text-muted-foreground">Mobile:</span> {o.contactMobile || o.customer?.mobile || "N/A"}</span>
                                                                                    <span><span className="text-muted-foreground">Email:</span> {o.contactEmail || "N/A"}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-muted-foreground block font-bold mb-1">IRCTC Info:</span>
                                                                                <div className="flex flex-col gap-0.5">
                                                                                    <span><span className="text-muted-foreground">User:</span> {o.irctcUser || "N/A"}</span>
                                                                                    <span><span className="text-muted-foreground">Pass:</span> {o.irctcPass || "N/A"}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="mt-2 pt-2 border-t flex justify-between col-span-2">
                                                                            <span className="text-muted-foreground">Base Price:</span> 
                                                                            <span className="font-bold">₹{o.basePrice?.toFixed(2) || "0.00"}</span>
                                                                        </div>
                                                                    </div>
                                                                    {o.description && (
                                                                        <p className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t">{o.description}</p>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                                                        <Folder className="w-3 h-3" /> Attached Tickets ({o.uploadIdsJson ? JSON.parse(o.uploadIdsJson).length : 0})
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
                                                                    <StatusTimeline order={o} type="train-booking" />
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

            <TrainBookingModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingOrder(null); }} onSave={handleSaved} booking={editingOrder} />
            <SimpleAlert open={alertConfig.isOpen} onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, isOpen: open }))} title={alertConfig.title} description={alertConfig.message} />
        </div>
    );
}
