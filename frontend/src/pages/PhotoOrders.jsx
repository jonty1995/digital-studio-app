import React, { useState } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Plus, Search } from "lucide-react";

// Mock Data
const MOCK_ORDERS = [
    {
        id: "1",
        photo: "https://placehold.co/50",
        name: "John Doe",
        customerId: "CUST001",
        items: "Passport Size x 8",
        total: 150,
        discount: 10,
        advance: 50,
        due: 90,
        status: "Pending",
        isInstant: true,
    },
    {
        id: "2",
        photo: "https://placehold.co/50",
        name: "Jane Smith",
        customerId: "CUST002",
        items: "4x6 Print x 2",
        total: 200,
        discount: 0,
        advance: 200,
        due: 0,
        status: "Completed",
        isInstant: false,
    },
];

import { PhotoOrderModal } from "../components/shared/PhotoOrderModal";

export default function PhotoOrders() {
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({ instant: true, regular: true });
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleFilterChange = (key) => {
        setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSaveOrder = (orderData) => {
        console.log("Saving order:", orderData);
        // Here you would typically make an API call
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

                    <Button size="sm" className="h-9 shadow-sm" onClick={() => setIsModalOpen(true)}>
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
                            {MOCK_ORDERS.map((order) => (
                                <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <TableCell>
                                        <div className="w-10 h-10 rounded-md overflow-hidden border bg-muted">
                                            <img src={order.photo} alt={order.name} className="w-full h-full object-cover" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{order.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{order.customerId}</TableCell>
                                    <TableCell>{order.items}</TableCell>
                                    <TableCell className="text-right font-medium">₹{order.total}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">₹{order.discount}</TableCell>
                                    <TableCell className="text-right">₹{order.advance}</TableCell>
                                    <TableCell className={`text-right font-bold ${order.due > 0 ? "text-destructive" : "text-green-600"}`}>
                                        ₹{order.due}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'Completed'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground"><path d="M8.625 2.5C8.625 3.12132 8.12132 3.625 7.5 3.625C6.87868 3.625 6.375 3.12132 6.375 2.5C6.375 1.87868 6.87868 1.375 7.5 1.375C8.12132 1.375 8.625 1.87868 8.625 2.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM7.5 13.625C8.12132 13.625 8.625 13.1213 8.625 12.5C8.625 11.8787 8.12132 11.375 7.5 11.375C6.87868 11.375 6.375 11.8787 6.375 12.5C6.375 13.1213 6.87868 13.625 7.5 13.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <PhotoOrderModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveOrder}
            />
        </div>
    );
}
