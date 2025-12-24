import React, { useState, useEffect } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Search } from "lucide-react";
import { customerService } from "../services/customerService";

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredCustomers, setFilteredCustomers] = useState([]);

    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredCustomers(customers);
            return;
        }
        const lower = searchQuery.toLowerCase();
        const filtered = customers.filter(c =>
            (c.name && c.name.toLowerCase().includes(lower)) ||
            (c.id && c.id.toString().includes(lower)) ||
            (c.mobile && c.mobile.includes(lower))
        );
        setFilteredCustomers(filtered);
    }, [searchQuery, customers]);

    const loadCustomers = async () => {
        try {
            const data = await customerService.getAll();
            setCustomers(data);
        } catch (error) {
            console.error("Failed to load customers:", error);
        }
    };

    const getType = (customer) => {
        // Logic: if mobile is present, assume "Mobile Number".
        // Or if ID length is 10.
        if (customer.mobile) return "Mobile Number";
        return "Generated ID";
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <PageHeader title="Customer List">
                <div className="relative w-96">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by customer ID or name..."
                        className="pl-9 h-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="text-sm text-muted-foreground ml-auto">
                    Total Customers: {customers.length}
                </div>
            </PageHeader>

            <div className="p-6 flex-1 overflow-auto">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[150px]">Customer ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-[150px]">Type</TableHead>
                                <TableHead className="w-[150px]">Created On</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.map((customer) => (
                                <TableRow key={customer.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="font-medium">{customer.id}</TableCell>
                                    <TableCell>{customer.name || "-"}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getType(customer) === 'Mobile Number'
                                                ? "bg-green-100 text-green-800"
                                                : "bg-blue-100 text-blue-800"
                                            }`}>
                                            {getType(customer)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'short', day: 'numeric'
                                        }) : "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
