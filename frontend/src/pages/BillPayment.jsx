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

export default function BillPayment() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const params = {
                page: page,
                size: 20,
                startDate: dateRange?.start,
                endDate: dateRange?.end,
                search: searchQuery
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
    }, [dateRange, searchQuery]);

    useEffect(() => {
        fetchTransactions();
    }, [page, dateRange, searchQuery]);

    const handleTransactionSaved = () => {
        fetchTransactions(); // Refresh list
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
                {/* No extra filters for now */}
            </FilterHeader>

            <div className="flex-1 p-6 pt-0 overflow-auto">
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Mode/File</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                                </TableRow>
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((txn) => (
                                    <TableRow key={txn.id} className={cn(
                                        "hover:bg-muted/50 transition-colors",
                                        viewMode === 'compact' ? 'py-1' : 'py-3'
                                    )}>
                                        <TableCell className={viewMode === 'compact' ? 'py-1' : 'py-3'}>
                                            {format(new Date(txn.createdAt), "dd MMM yyyy, hh:mm a")}
                                        </TableCell>
                                        <TableCell className={viewMode === 'compact' ? 'py-1' : 'py-3'}>
                                            <Badge variant="outline">{txn.transactionType}</Badge>
                                        </TableCell>
                                        <TableCell className={viewMode === 'compact' ? 'py-1' : 'py-3'}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{txn.customer?.name}</span>
                                                <span className="text-xs text-muted-foreground">{txn.customer?.mobileNumber}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className={viewMode === 'compact' ? 'py-1' : 'py-3'}>
                                            <div className="flex flex-col text-sm">
                                                {txn.operator && <span className="font-medium">{txn.operator}</span>}
                                                <span className="text-muted-foreground">
                                                    {txn.transactionType === 'ELECTRICITY' ? `Bill ID: ` :
                                                        txn.transactionType === 'MOBILE' ? `Mobile: ` : `ID: `}
                                                    {txn.billId}
                                                </span>
                                                {txn.billCustomerName && <span className="text-xs text-muted-foreground">Name: {txn.billCustomerName}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className={cn("font-semibold", viewMode === 'compact' ? 'py-1' : 'py-3')}>
                                            ₹{txn.payment?.totalAmount?.toFixed(2)}
                                        </TableCell>
                                        <TableCell className={viewMode === 'compact' ? 'py-1' : 'py-3'}>
                                            <Badge variant={txn.status === 'Completed' ? 'default' : 'secondary'}>{txn.status}</Badge>
                                        </TableCell>
                                        <TableCell className={viewMode === 'compact' ? 'py-1' : 'py-3'}>
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
                                ))
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
