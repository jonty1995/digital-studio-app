import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { FilterHeader, useViewMode } from "../components/shared/FilterHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Plus, Pencil, FileText, Loader2, Download, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { orderService } from "../services/orderService";
import { PhotoOrderModal } from "../components/shared/PhotoOrderModal";
import { useRef, useCallback } from "react";
import { format } from "date-fns";

import { FileViewer } from "../components/shared/FileViewer";

export default function PhotoOrders() {
    const [orders, setOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({ instant: true, regular: true });

    // Refs
    const isFirstLoad = useRef(true);

    // Pagination & View State
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useViewMode("photo-orders-view-mode"); // 'compact' | 'cozy'

    // Initialize date range (Defaults handled by FilterHeader)
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    const observer = useRef();
    const lastOrderElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // File Viewer State
    const [viewerFileId, setViewerFileId] = useState(null);
    const [expandedOrderId, setExpandedOrderId] = useState(null);

    // Sticky session ID for the form
    const [formSessionId, setFormSessionId] = useState(() => {
        const stored = sessionStorage.getItem("photoOrderSessionId");
        if (stored) return stored;
        const newId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem("photoOrderSessionId", newId);
        return newId;
    });

    // Filter Change Effect
    useEffect(() => {
        console.log("Filter Effect Triggered", filters, dateRange, searchQuery);
        if (isFirstLoad.current) {
            isFirstLoad.current = false;
            loadOrders(0, true, filters, dateRange); // Keep in sync
            return;
        }
        setPage(0);
        setOrders([]);
        setHasMore(true);
        loadOrders(0, true, filters, dateRange);
    }, [filters, dateRange, searchQuery]);

    const loadOrders = async (pageNum, isReset = false, currentFilters = filters, currentDateRange = dateRange) => {
        console.log("Loading orders...", pageNum, isReset, currentFilters);
        setLoading(true);
        try {
            const apiFilters = {
                startDate: currentDateRange.start || "",
                endDate: currentDateRange.end || "",
                search: searchQuery,
                instant: currentFilters.instant,
                regular: currentFilters.regular
            };
            console.log("API Filters:", apiFilters);

            const data = await orderService.getAllOrders(apiFilters, pageNum, 20);
            // Check structure: Page<T> has content
            const newOrders = data.content || [];

            setOrders(prev => {
                if (isReset || pageNum === 0) return newOrders;
                // De-dup
                const existingIds = new Set(prev.map(o => o.orderId));
                const uniqueNew = newOrders.filter(o => !existingIds.has(o.orderId));
                return [...prev, ...uniqueNew];
            });
            setHasMore(!data.last); // 'last' is true if last page
        } catch (error) {
            console.error("Failed to load orders:", error);
        } finally {
            setLoading(false);
        }
    };


    const handleFilterChange = (key) => {
        setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleDateChange = (type, value) => {
        setDateRange(prev => {
            const newRange = { ...prev, [type]: value };
            // Validation: Start cannot be after End
            if (newRange.start && newRange.end && newRange.start > newRange.end) {
                if (type === 'start') {
                    // If moving start past end, push end to match start (or could block)
                    // Let's standardise: To date updates to match From date
                    return { start: value, end: value };
                } else {
                    // If moving end before start, push start to match end (or match start)
                    return { start: value, end: value };
                }
            }
            return newRange;
        });
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Helper to check if order is Instant
    const isInstantOrder = (order) => {
        try {
            const items = typeof order.itemsJson === 'string' ? JSON.parse(order.itemsJson) : order.itemsJson;
            return Array.isArray(items) && items.some(i => i.isInstant);
        } catch { return false; }
    };

    // Sorting Logic (Sorts ONLY visible data for now, ideally server-side too but keeping client for quick UI feedback on loaded rows)
    const sortedOrders = [...orders].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Specific accessors
        if (sortConfig.key === 'customer.name') {
            aValue = a.customer?.name || '';
            bValue = b.customer?.name || '';
        } else if (sortConfig.key === 'customer.id') {
            aValue = a.customer?.id || '';
            bValue = b.customer?.id || '';
        } else if (sortConfig.key === 'date') {
            aValue = a.timestamp || a.createdAt || '';
            bValue = b.timestamp || b.createdAt || '';
        } else if (sortConfig.key === 'total') {
            aValue = a.payment?.totalAmount || 0;
            bValue = b.payment?.totalAmount || 0;
        } else if (sortConfig.key === 'discount') {
            aValue = a.payment?.discountAmount || 0;
            bValue = b.payment?.discountAmount || 0;
        } else if (sortConfig.key === 'advance') {
            aValue = a.payment?.advanceAmount || 0;
            bValue = b.payment?.advanceAmount || 0;
        } else if (sortConfig.key === 'due') {
            aValue = a.payment?.dueAmount || 0;
            bValue = b.payment?.dueAmount || 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSaveOrder = async (orderData) => {
        try {
            if (Array.isArray(orderData)) {
                // Handle Split Orders (Array)
                for (const order of orderData) {
                    await orderService.createOrder(order);
                }
            } else {
                // Handle Single Order
                await orderService.createOrder(orderData);
            }

            await loadOrders(0, true);
            // Generate new session ID for next order
            const newId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            setFormSessionId(newId);
            sessionStorage.setItem("photoOrderSessionId", newId);
        } catch (error) {
            console.error("Failed to save order:", error);
            alert("Failed to save order. Check console.");
        }
    };

    const formatItems = (json) => {
        try {
            const items = JSON.parse(json);
            if (Array.isArray(items)) {
                return items.map(i => `${i.type} x ${i.quantity}`).join(", ");
            }
            return "Invalid Items";
        } catch {
            return "Error";
        }
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <span className="ml-1 text-gray-300">↕</span>;
        return sortConfig.direction === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <FilterHeader
                title="Photo Orders"
                dateRange={dateRange}
                onDateChange={handleDateChange}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                action={
                    <Button size="sm" className="h-9 shadow-sm" onClick={() => { setSelectedOrder(null); setIsModalOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Order
                    </Button>
                }
            >
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors">
                    <input type="checkbox" checked={filters.instant} onChange={() => handleFilterChange("instant")} className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary" />
                    Instant
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors">
                    <input type="checkbox" checked={filters.regular} onChange={() => handleFilterChange("regular")} className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary" />
                    Regular
                </label>
            </FilterHeader>


            <div className="p-6 flex-1 overflow-auto">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b">
                                <TableHead className={`w-[80px] font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>File</TableHead>
                                <TableHead className={`cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('date')}>
                                    Date <SortIcon column="date" />
                                </TableHead>
                                <TableHead className={`cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('customer.name')}>
                                    Name <SortIcon column="customer.name" />
                                </TableHead>
                                <TableHead className={`cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('customer.id')}>
                                    ID <SortIcon column="customer.id" />
                                </TableHead>
                                <TableHead className={`font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Items</TableHead>
                                <TableHead className={`text-right cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('total')}>
                                    Total <SortIcon column="total" />
                                </TableHead>
                                <TableHead className={`text-right cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('discount')}>
                                    Disc <SortIcon column="discount" />
                                </TableHead>
                                <TableHead className={`text-right cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('advance')}>
                                    Adv <SortIcon column="advance" />
                                </TableHead>
                                <TableHead className={`text-right cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('due')}>
                                    Due <SortIcon column="due" />
                                </TableHead>
                                <TableHead className={`text-center cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('status')}>
                                    Status <SortIcon column="status" />
                                </TableHead>
                                <TableHead className={`text-right font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedOrders.map((order, index) => {
                                const isInstant = isInstantOrder(order);
                                const isLast = index === sortedOrders.length - 1;
                                const pClass = viewMode === 'compact' ? 'p-2' : 'p-4';
                                const hClass = viewMode === 'compact' ? 'h-10' : '';
                                const imgClass = viewMode === 'compact' ? 'w-8 h-8' : 'w-12 h-12 shadow-sm';

                                const isExpanded = expandedOrderId === order.orderId;
                                const fileId = order.uploadId;
                                const isPdf = fileId && fileId.toLowerCase().endsWith('.pdf');
                                const hasFile = !!fileId;

                                return (
                                    <React.Fragment key={order.orderId}>
                                        <TableRow
                                            ref={isLast ? lastOrderElementRef : null}
                                            className={`cursor-pointer border-b transition-colors ${hClass} ${isExpanded ? 'bg-muted/50' : 'hover:bg-gray-100/60 dark:hover:bg-gray-800/60'}`}
                                            onClick={() => setExpandedOrderId(isExpanded ? null : order.orderId)}
                                            title={order.description} // Tooltip on hover
                                        >
                                            <TableCell className={`${pClass} align-middle`}>
                                                <div
                                                    className={`${imgClass} rounded-md overflow-hidden border bg-muted flex items-center justify-center cursor-zoom-in relative group`}
                                                    onClick={(e) => {
                                                        if (fileId) {
                                                            e.stopPropagation(); // Don't trigger row expand
                                                            setViewerFileId(fileId);
                                                        }
                                                    }}
                                                >
                                                    {fileId ? (
                                                        <>
                                                            {isPdf ? (
                                                                <FileText className={`${viewMode === 'compact' ? 'h-4 w-4' : 'h-6 w-6'} text-red-500`} />
                                                            ) : (
                                                                <img
                                                                    src={`/api/files/${fileId}`}
                                                                    alt="Order"
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                                />
                                                            )}

                                                            {/* Download Overlay */}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Button
                                                                    size="icon"
                                                                    variant="secondary"
                                                                    className="h-8 w-8 rounded-full shadow-md hover:scale-110 transition-transform"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const link = document.createElement('a');
                                                                        link.href = `/api/files/${order.uploadId}`;
                                                                        link.download = order.uploadId; // Enforce Generated ID + Ext
                                                                        document.body.appendChild(link);
                                                                        link.click();
                                                                        document.body.removeChild(link);
                                                                    }}
                                                                    title="Download File"
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-200" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className={`${pClass} align-middle font-medium`}>
                                                {new Date(order.timestamp || order.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className={`${pClass} align-middle font-medium`}>
                                                {order.customer?.name || "Unknown"}
                                                {isInstant && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 shadow-sm">Instant</span>}
                                            </TableCell>
                                            <TableCell className={`${pClass} align-middle text-muted-foreground`}>{order.customer?.id ? order.customer.id : "-"}</TableCell>
                                            <TableCell className={`${pClass} align-middle max-w-[200px] text-sm`} title={formatItems(order.itemsJson)}>{formatItems(order.itemsJson)}</TableCell>
                                            <TableCell className={`${pClass} align-middle text-right font-medium`}>₹{order.payment?.totalAmount || 0}</TableCell>
                                            <TableCell className={`${pClass} align-middle text-right text-muted-foreground`}>₹{order.payment?.discountAmount || 0}</TableCell>
                                            <TableCell className={`${pClass} align-middle text-right`}>₹{order.payment?.advanceAmount || 0}</TableCell>
                                            <TableCell className={`${pClass} align-middle text-right font-bold ${order.payment?.dueAmount > 0 ? "text-destructive" : "text-green-600"}`}>
                                                ₹{order.payment?.dueAmount || 0}
                                            </TableCell>
                                            <TableCell className={`${pClass} align-middle text-center`}>
                                                <Badge variant={order.status === 'Completed' ? 'default' : 'secondary'} className={`${order.status === 'Completed' ? 'bg-emerald-500 hover:bg-emerald-600' : ''} shadow-sm`}>
                                                    {order.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`${pClass} align-middle text-right`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Order" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setIsModalOpen(true); }}>
                                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>

                                        {isExpanded && (
                                            <TableRow className="bg-muted/30 border-b animate-in fade-in zoom-in-95 duration-200">
                                                <TableCell colSpan={11} className="p-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-sm pl-4 relative mb-4">
                                                        <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary/20 rounded-full"></div>

                                                        {/* Entry Date */}
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold">Entry Date</span>
                                                            <span className="font-medium text-foreground/80 font-mono">
                                                                {order.createdAt ? format(new Date(order.createdAt), "dd MMM yyyy, hh:mm a") : "N/A"}
                                                            </span>
                                                        </div>

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

                                                        {/* Upload ID */}
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold">Upload ID</span>
                                                            <span className="font-mono text-pink-600 font-medium">{order.uploadId || "N/A"}</span>
                                                        </div>

                                                        {/* Original File Name */}
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold">Original File Name</span>
                                                            <div className="truncate max-w-[200px] font-medium text-foreground/80" title={order.originalFilename || "N/A"}>
                                                                {order.originalFilename || "N/A"}
                                                            </div>
                                                        </div>

                                                        {/* Description */}
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-muted-foreground text-xs uppercase tracking-wider font-bold">Description</span>
                                                            <div className="bg-background border rounded-md p-2 text-xs max-h-[80px] overflow-y-auto font-mono text-foreground/90 whitespace-pre-wrap shadow-sm">
                                                                {order.description || <span className="text-muted-foreground italic">No instructions.</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center p-4">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading more...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {isModalOpen && (
                <PhotoOrderModal
                    isOpen={isModalOpen}
                    onClose={() => { setIsModalOpen(false); setSelectedOrder(null); }}
                    onSave={handleSaveOrder}
                    instanceId={formSessionId}
                    editOrder={selectedOrder}
                />
            )}

            <FileViewer
                fileId={viewerFileId}
                isOpen={!!viewerFileId}
                onClose={() => setViewerFileId(null)}
            />
        </div>
    );
}
