import React, { useState, useEffect } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Plus, Search, Pencil } from "lucide-react";
import { orderService } from "../services/orderService";
import { PhotoOrderModal } from "../components/shared/PhotoOrderModal";

export default function PhotoOrders() {
    const [orders, setOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({ instant: true, regular: true });
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Sticky session ID for the form
    const [formSessionId, setFormSessionId] = useState(() => {
        const stored = sessionStorage.getItem("photoOrderSessionId");
        if (stored) return stored;
        const newId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem("photoOrderSessionId", newId);
        return newId;
    });

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const data = await orderService.getAllOrders();
            setOrders(data);
        } catch (error) {
            console.error("Failed to load orders:", error);
        }
    };

    const handleFilterChange = (key) => {
        setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSaveOrder = async (orderData) => {
        try {
            await orderService.createOrder(orderData);
            await loadOrders();
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

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <PageHeader
                title="Photo Orders"
            >
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Input type="date" className="w-[140px] h-9" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} aria-label="Start Date" />
                        <span className="text-sm font-medium text-muted-foreground">-</span>
                        <Input type="date" className="w-[140px] h-9" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} aria-label="End Date" />
                    </div>

                    <div className="flex items-center gap-4 border-l pl-4 h-9">
                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors">
                            <input type="checkbox" checked={filters.instant} onChange={() => handleFilterChange("instant")} className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary" />
                            Instant
                        </label>
                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors">
                            <input type="checkbox" checked={filters.regular} onChange={() => handleFilterChange("regular")} className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary" />
                            Regular
                        </label>
                    </div>

                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, customer id"
                            className="pl-9 h-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <Button size="sm" className="h-9 shadow-sm" onClick={() => { setSelectedOrder(null); setIsModalOpen(true); }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Order
                    </Button>
                </div>
            </PageHeader>

            <div className="p-6 flex-1 overflow-auto">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[80px]">Photo</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Customer ID</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Discount</TableHead>
                                <TableHead className="text-right">Advance</TableHead>
                                <TableHead className="text-right">Due</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.orderId} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <TableCell>
                                        <div className="w-10 h-10 rounded-md overflow-hidden border bg-muted">
                                            {/* Handle image display if available (uploadId used?) */}
                                            <div className="w-full h-full bg-gray-200" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{order.customer?.name || "Unknown"}</TableCell>
                                    <TableCell className="text-muted-foreground">{order.customer?.id ? order.customer.id : "-"}</TableCell>
                                    <TableCell>{formatItems(order.itemsJson)}</TableCell>
                                    <TableCell className="text-right font-medium">₹{order.payment?.totalAmount || 0}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">₹{order.payment?.discountAmount || 0}</TableCell>
                                    <TableCell className="text-right">₹{order.payment?.advanceAmount || 0}</TableCell>
                                    <TableCell className={`text-right font-bold ${order.payment?.dueAmount > 0 ? "text-destructive" : "text-green-600"}`}>
                                        ₹{order.payment?.dueAmount || 0}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'Completed'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit Order" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setIsModalOpen(true); }}>
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
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
        </div>
    );
}

