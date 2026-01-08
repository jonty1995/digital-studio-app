import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, Search } from "lucide-react";
import { FilterHeader, useViewMode } from "@/components/shared/FilterHeader";
import { cn } from "@/lib/utils";
import { BillPaymentModal } from "@/components/shared/BillPaymentModal";
import { billPaymentService } from "@/services/billPaymentService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { CopyButton } from "@/components/shared/CopyButton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function BillPayment() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // View Mode from Hook
    const [viewMode, setViewMode] = useViewMode("bill-payment-view-mode");

    // Alert State
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "" });
    const showAlert = (title, message) => {
        setAlertConfig({ isOpen: true, title, message });
    };

    // Filters & Pagination
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    // Initialize date range with Today (YYYY-MM-DD)
    const [dateRange, setDateRange] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        return { start: today, end: today };
    });
    const [searchQuery, setSearchQuery] = useState("");

    // Filters State
    const [filters, setFilters] = useState({
        ELECTRICITY: true,
        MOBILE: true,
        DTH: true
    });

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const handleFilterChange = (key) => {
        setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <span className="ml-1 text-gray-300">↕</span>;
        return sortConfig.direction === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
    };

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            // Convert filters object to array of active types
            const activeTypes = Object.keys(filters).filter(key => filters[key]);

            const params = {
                page: page,
                size: 20,
                startDate: dateRange?.start,
                endDate: dateRange?.end,
                search: searchQuery,
                types: activeTypes
            };

            const data = await billPaymentService.getAll(params);
            setTransactions(data.content || []);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
            showAlert("Error", "Failed to load transactions.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Reset page when filters change
        setPage(0);
    }, [dateRange, searchQuery, filters]);

    useEffect(() => {
        fetchTransactions();
    }, [page, dateRange, searchQuery, filters]);

    // Sorting Logic (Client-side for current page)
    const sortedTransactions = [...transactions].sort((a, b) => {
        if (!sortConfig.key) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Specific accessors
        if (sortConfig.key === 'date') {
            aValue = a.createdAt;
            bValue = b.createdAt;
        } else if (sortConfig.key === 'customer.id') {
            aValue = a.customer?.id || '';
            bValue = b.customer?.id || '';
        } else if (sortConfig.key === 'amount') {
            aValue = a.payment?.totalAmount || 0;
            bValue = b.payment?.totalAmount || 0;
        } else if (sortConfig.key === 'status') {
            aValue = a.status || '';
            bValue = b.status || '';
        } else if (sortConfig.key === 'type') {
            aValue = a.transactionType || '';
            bValue = b.transactionType || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleTransactionSaved = async (payload, file) => {
        try {
            // 1. Upload File if present
            if (file) {
                // Determine source folder based on transaction type
                const source = payload.transactionType ? payload.transactionType.toLowerCase() : "others";
                const uploadResponse = await import("@/services/fileService").then(m => m.fileService.upload(file, source));
                payload.uploadId = uploadResponse.downloadUrl.split('/').pop(); // Extract ID
            }

            // 2. Create Transaction
            await billPaymentService.create(payload);

            // 3. Refresh and Close
            fetchTransactions();
            setIsModalOpen(false);
            showAlert("Success", "Transaction created successfully.");
        } catch (error) {
            console.error("Failed to save transaction:", error);
            showAlert("Error", `Failed to save: ${error.message}`);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await billPaymentService.updateStatus(id, status);
            fetchTransactions();
        } catch (error) {
            console.error("Status update failed:", error);
            showAlert("Error", "Failed to update status");
        }
    };

    const handleRevertStatus = async (id) => {
        handleStatusUpdate(id, 'Pending');
    };

    const handleDateChange = (type, value) => {
        if (type === 'range') {
            setDateRange(value);
            return;
        }

        setDateRange(prev => {
            const newRange = { ...prev, [type]: value };
            // Validation: Start cannot be after End
            if (newRange.start && newRange.end && newRange.start > newRange.end) {
                if (type === 'start') {
                    // Update End to match Start
                    return { start: value, end: value };
                } else {
                    // Update Start to match End
                    return { start: value, end: value };
                }
            }
            return newRange;
        });
    };

    const getDthLabel = (operator) => {
        if (!operator) return "Subscriber ID";
        const op = operator.toLowerCase();
        if (op.includes("dish")) return "Mobile / Viewing Card No";
        if (op.includes("d2h")) return "Subscriber ID";
        if (op.includes("tata")) return "Subscriber ID / Mobile No";
        if (op.includes("airtel")) return "Customer ID";
        if (op.includes("sun")) return "Smart Card Number";
        return "Subscriber ID";
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <FilterHeader
                title="Bill Payments"
                dateRange={dateRange}
                onDateChange={handleDateChange}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                action={
                    <Button size="sm" className="h-9 shadow-sm" onClick={() => setIsModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Transaction
                    </Button>
                }
            >
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors">
                    <input type="checkbox" checked={filters.ELECTRICITY} onChange={() => handleFilterChange("ELECTRICITY")} className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary" />
                    Electricity
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors">
                    <input type="checkbox" checked={filters.MOBILE} onChange={() => handleFilterChange("MOBILE")} className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary" />
                    Mobile
                </label>
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer hover:text-primary transition-colors">
                    <input type="checkbox" checked={filters.DTH} onChange={() => handleFilterChange("DTH")} className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary" />
                    DTH
                </label>
            </FilterHeader>

            <div className="flex-1 p-6 pt-0 overflow-auto">
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className={`w-[130px] cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('date')}>
                                    Date <SortIcon column="date" />
                                </TableHead>
                                <TableHead className={`w-[100px] cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('type')}>
                                    Type <SortIcon column="type" />
                                </TableHead>
                                <TableHead className={`cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('customer.id')}>
                                    Customer ID <SortIcon column="customer.id" />
                                </TableHead>
                                <TableHead className={`font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Details</TableHead>
                                <TableHead className={`cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('amount')}>
                                    Amount <SortIcon column="amount" />
                                </TableHead>
                                <TableHead className={`cursor-pointer hover:text-primary font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`} onClick={() => handleSort('status')}>
                                    Status <SortIcon column="status" />
                                </TableHead>
                                <TableHead className={`font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Mode/File</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            Loading...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : sortedTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedTransactions.map((txn) => {
                                    const pClass = viewMode === 'compact' ? 'p-2' : 'p-4';
                                    const hClass = viewMode === 'compact' ? 'h-10' : '';

                                    return (
                                        <TableRow key={txn.id} className={cn(
                                            "cursor-pointer border-b transition-colors hover:bg-gray-100/60 dark:hover:bg-gray-800/60",
                                            hClass
                                        )}>
                                            <TableCell className={`${pClass} align-middle font-medium`}>
                                                {new Date(txn.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className={`${pClass} align-middle`}>
                                                <Badge variant="outline">{txn.transactionType}</Badge>
                                            </TableCell>
                                            <TableCell className={`${pClass} align-middle font-medium`}>
                                                <div className="flex items-center gap-1 group/cid">
                                                    <span>{txn.customer?.id || "-"}</span>
                                                    {txn.customer?.id && (
                                                        <CopyButton
                                                            text={txn.customer.id}
                                                            className="h-5 w-5 opacity-0 group-hover/cid:opacity-100 transition-opacity"
                                                            title="Copy Customer ID"
                                                            iconClass="text-muted-foreground"
                                                        />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className={`${pClass} align-middle`}>
                                                <div className="flex flex-col text-sm">
                                                    {txn.operator && <span className="font-medium">{txn.operator}</span>}
                                                    <span className="text-muted-foreground">
                                                        {txn.transactionType === 'ELECTRICITY' ? 'Consumer No: ' :
                                                            txn.transactionType === 'MOBILE' ? 'Mobile No: ' :
                                                                txn.transactionType === 'DTH' ? `${getDthLabel(txn.operator)}: ` : 'ID: '}
                                                        <div className="inline-flex items-center gap-1 group/bid">
                                                            <span className="font-medium text-foreground">{txn.billId}</span>
                                                            <CopyButton
                                                                text={txn.billId}
                                                                className="h-4 w-4 opacity-0 group-hover/bid:opacity-100 transition-opacity"
                                                                title="Copy ID"
                                                                iconClass="text-muted-foreground"
                                                            />
                                                        </div>
                                                    </span>
                                                    {txn.billCustomerName && <span className="text-xs text-muted-foreground">Bill Name: {txn.billCustomerName}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className={cn("font-semibold", pClass, "align-middle")}>
                                                ₹{txn.payment?.totalAmount?.toFixed(2)}
                                            </TableCell>
                                            <TableCell className={`${pClass} align-middle`}>
                                                <DropdownMenu
                                                    open={openDropdownId === txn.id}
                                                    onOpenChange={(isOpen) => !isOpen && setOpenDropdownId(null)}
                                                >
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="h-auto p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                if (txn.status === 'Pending') {
                                                                    handleStatusUpdate(txn.id, 'Done');
                                                                }
                                                            }}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setOpenDropdownId(txn.id);
                                                            }}
                                                        >
                                                            <Badge
                                                                variant={txn.status === 'Completed' || txn.status === 'Done' ? 'default' :
                                                                    txn.status === 'Failed' || txn.status === 'Discard' || txn.status === 'Refunded' ? 'destructive' : 'secondary'}
                                                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                                            >
                                                                {txn.status}
                                                            </Badge>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {txn.status === 'Pending' && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleStatusUpdate(txn.id, 'Done')}>
                                                                    Mark as Done
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusUpdate(txn.id, 'Discard')}>
                                                                    Mark as Discard
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusUpdate(txn.id, 'Failed')} className="text-destructive">
                                                                    Mark as Failed
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        {txn.status === 'Failed' && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleStatusUpdate(txn.id, 'Refunded')}>
                                                                    Mark as Refunded
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleRevertStatus(txn.id)}>
                                                                    Revert to Pending
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        {(txn.status === 'Done' || txn.status === 'Discard' || txn.status === 'Refunded') && (
                                                            <DropdownMenuItem onClick={() => handleRevertStatus(txn.id)}>
                                                                Revert to Pending
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell className={`${pClass} align-middle`}>
                                                <div className="flex flex-wrap gap-1">
                                                    <Badge variant="outline">{txn.payment?.paymentMode}</Badge>
                                                    {txn.uploadId && (
                                                        <Badge variant="outline" className="gap-1 pr-1">
                                                            File <span className="text-[10px]">📎</span>
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex justify-end items-center space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page + 1} of {totalPages || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                    >
                        Next
                    </Button>
                </div>
            </div>

            <BillPaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleTransactionSaved}
            />

            <SimpleAlert
                open={alertConfig.isOpen}
                onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, isOpen: open }))}
                title={alertConfig.title}
                description={alertConfig.message}
            />
        </div>
    );
}
