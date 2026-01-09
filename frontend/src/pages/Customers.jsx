import React, { useState, useEffect } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Search, ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react";
import { customerService } from "../services/customerService";

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        loadCustomers();
    }, []);

    useEffect(() => {
        let result = customers;

        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            result = result.filter(c =>
                (c.name && c.name.toLowerCase().includes(lower)) ||
                (c.id && c.id.toString().includes(lower)) ||
                (c.mobile && c.mobile.includes(lower))
            );
        }

        if (sortConfig.key) {
            result = [...result].sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Handle nulls
                if (aVal == null) aVal = "";
                if (bVal == null) bVal = "";

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        setFilteredCustomers(result);
    }, [searchQuery, customers, sortConfig]);

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleRow = (id) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedRows(newSet);
    };

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

            <div className="p-6 flex-1 flex flex-col min-h-0">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm flex-1 flex flex-col min-h-0">
                    <Table containerClassName="flex-1 overflow-auto h-full">
                        <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead className="w-[150px] cursor-pointer" onClick={() => handleSort('id')}>
                                    Customer ID <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                                    Name <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                </TableHead>
                                <TableHead className="w-[150px]">Type</TableHead>
                                <TableHead className="w-[150px] cursor-pointer" onClick={() => handleSort('createdAt')}>
                                    Created On <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.map((customer) => {
                                const isExpanded = expandedRows.has(customer.id);
                                const history = customer.editHistoryJson ? JSON.parse(customer.editHistoryJson) : [];

                                return (
                                    <React.Fragment key={customer.id}>
                                        <TableRow className="hover:bg-muted/50 transition-colors" onClick={() => toggleRow(customer.id)}>
                                            <TableCell>
                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </TableCell>
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
                                        {isExpanded && (
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableCell colSpan={5} className="p-4">
                                                    <div className="space-y-2">
                                                        <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                                                            Edit History ({history.length})
                                                        </h4>
                                                        {history.length > 0 ? (
                                                            <div className="text-sm space-y-2 pl-4 border-l-2 border-muted">
                                                                {history.map((entry, idx) => (
                                                                    <div key={idx} className="grid grid-cols-[100px_1fr_150px] gap-4 items-center">
                                                                        <span className={`font-semibold ${entry.action === 'Created' ? 'text-green-600' : 'text-blue-600'}`}>
                                                                            {entry.action}
                                                                        </span>
                                                                        <span className="text-foreground/80">
                                                                            {entry.details || "-"}
                                                                        </span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            {new Date(entry.timestamp).toLocaleString(undefined, {
                                                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground italic">No history available.</p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
