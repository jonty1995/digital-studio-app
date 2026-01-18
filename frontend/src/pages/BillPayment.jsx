import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { Plus, Receipt, Search, Trash2, Unlink, Eye, Download, Upload, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { FilterHeader, useViewMode } from "@/components/shared/FilterHeader";
import { OrderStatus } from "@/components/shared/OrderStatus";
import { StatusTimeline } from "@/components/shared/StatusTimeline";
import { cn } from "@/lib/utils";
import { BillPaymentModal } from "@/components/shared/BillPaymentModal";
import { ReceiptUploadModal } from "@/components/shared/ReceiptUploadModal";
import { billPaymentService } from "@/services/billPaymentService";
import { configurationService } from "@/services/configurationService";
import { fileService } from "@/services/fileService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { CopyButton } from "@/components/shared/CopyButton";

export default function BillPayment() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Receipt Upload State
    const [uploadModalState, setUploadModalState] = useState({ isOpen: false, txn: null });
    const [selectedTxnId, setSelectedTxnId] = useState(null);
    const [expandedTxnId, setExpandedTxnId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [scrollBlockSize, setScrollBlockSize] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const observer = useRef();

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
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
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

    const lastTransactionElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    useEffect(() => {
        const fetchBlockSize = async () => {
            try {
                const values = await configurationService.getValues();
                const blockSizeConfig = values.find(v => v.name === "SCROLL_BLOCK_SIZE");
                if (blockSizeConfig && blockSizeConfig.value) {
                    setScrollBlockSize(parseInt(blockSizeConfig.value));
                }
            } catch (e) {
                console.error("Failed to fetch SCROLL_BLOCK_SIZE", e);
            }
        };
        fetchBlockSize();
    }, []);

    const fetchTransactions = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            // Convert filters object to array of active types
            const activeTypes = Object.keys(filters).filter(key => filters[key]);

            const params = {
                page: page,
                size: scrollBlockSize,
                startDate: dateRange?.start,
                endDate: dateRange?.end,
                search: searchQuery,
                types: activeTypes
            };

            const data = await billPaymentService.getAll(params);
            const newTxns = data.content || [];

            setTransactions(prev => {
                const combined = page === 0 ? newTxns : [...prev, ...newTxns];
                // Dedup by ID
                const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
                return unique;
            });

            setHasMore(!data.last && newTxns.length > 0);
            setTotalItems(data.totalElements || 0);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
            if (!isBackground) showAlert("Error", "Failed to load transactions.");
        } finally {
            if (!isBackground) setLoading(false);
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
                // User requested receipts in "Bill Payment" folder
                const source = "Bill Payment";
                const uploadResponse = await fileService.upload(file, source);
                payload.uploadId = uploadResponse.uploadId; // Use ID
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

    const handleReceiptUpload = async (uploadId) => {
        if (!uploadModalState.txn) return;
        try {
            await billPaymentService.update(uploadModalState.txn.id, { uploadId });
            setUploadModalState({ isOpen: false, txn: null });
            fetchTransactions(true); // Silent refresh
            showAlert("Success", "Receipt linked successfully.");
        } catch (error) {
            console.error("Failed to link receipt:", error);
            showAlert("Error", "Failed to link receipt.");
        }
    };

    const handleReceiptUnlink = async (txn) => {
        try {
            await billPaymentService.update(txn.id, { uploadId: null });
            fetchTransactions(true); // Silent refresh
            showAlert("Success", "Receipt unlinked successfully.");
        } catch (error) {
            console.error("Failed to unlink receipt:", error);
            showAlert("Error", "Failed to unlink receipt.");
        }
    };

    const handleReceiptDeleteFile = async (txn) => {
        if (!confirm("Are you sure you want to PERMANENTLY delete this file? This cannot be undone.")) return;

        const remarks = prompt("Please enter remarks for deletion:");
        if (remarks === null) return; // User cancelled

        try {
            // 1. Unlink first (safest)
            await billPaymentService.update(txn.id, { uploadId: null });

            // 2. Delete file
            // Note: If multiple transactions use the same file, this deletes it for all!
            // Assuming 1:1 for receipts usually.
            await fileService.delete(txn.uploadId, remarks);

            fetchTransactions(true); // Silent refresh
            showAlert("Success", "Receipt file deleted and unlinked.");
        } catch (error) {
            console.error("Failed to delete receipt file:", error);
            showAlert("Error", "Failed to delete file. It may be unlinked.");
        }
    };

    // Handle Direct File Upload (Drop or Paste)
    const processFileUpload = async (file, txn) => {
        if (txn.status !== 'Done') {
            showAlert("Warning", "Receipts can only be uploaded for 'Done' transactions.");
            return;
        }

        try {
            // User requested receipts in "Bill Payment" folder
            const source = "Bill Payment";
            const uploadResponse = await fileService.upload(file, source);
            await billPaymentService.update(txn.id, { uploadId: uploadResponse.uploadId });
            fetchTransactions(true); // Silent refresh
            showAlert("Success", "Receipt uploaded successfully.");
        } catch (error) {
            console.error("Upload failed:", error);
            showAlert("Error", "Failed to upload receipt.");
        }
    };

    const handleRowPaste = (e, txn) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile();
                if (file) {
                    processFileUpload(file, txn);
                    e.preventDefault();
                    return;
                }
            }
        }
    };

    const handleRowDrop = (e, txn) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            processFileUpload(files[0], txn);
        }
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

            <div className="flex-1 p-6 pt-0 flex flex-col min-h-0">
                <div className="rounded-md border bg-card flex-1 flex flex-col min-h-0">
                    <Table containerClassName="flex-1 overflow-auto h-full">
                        <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
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
                                <TableHead className={`font-medium text-muted-foreground ${viewMode === 'compact' ? 'p-2' : 'p-4'}`}>Receipt</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && page === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            Loading...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : sortedTransactions.length === 0 && !loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedTransactions.map((txn, index) => {
                                    const pClass = viewMode === 'compact' ? 'p-2' : 'p-4';
                                    const hClass = viewMode === 'compact' ? 'h-10' : '';

                                    const isExpanded = expandedTxnId === txn.id;

                                    return (
                                        <React.Fragment key={txn.id}>
                                            <TableRow
                                                ref={index === sortedTransactions.length - 1 ? lastTransactionElementRef : null}
                                                className={cn(
                                                    "cursor-pointer border-b transition-colors outline-none focus:bg-blue-50/50",
                                                    hClass,
                                                    isExpanded ? "bg-muted/50" : "hover:bg-gray-100/60 dark:hover:bg-gray-800/60",
                                                    selectedTxnId === txn.id ? "bg-blue-50/30" : ""
                                                )}
                                                tabIndex={0}
                                                onClick={() => setExpandedTxnId(isExpanded ? null : txn.id)}
                                                onPaste={(e) => handleRowPaste(e, txn)}
                                                onDragOver={(e) => e.preventDefault()}
                                                onDrop={(e) => handleRowDrop(e, txn)}
                                            >
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
                                                    <OrderStatus
                                                        order={txn}
                                                        type="bill-payment"
                                                        updateFn={(id, status) => billPaymentService.updateStatus(id, status)}
                                                        onUpdate={() => fetchTransactions(true)}
                                                    />
                                                </TableCell>
                                                <TableCell className={`${pClass} align-middle`}>
                                                    <div className="flex items-center gap-2">
                                                        {/* Receipt Upload UI - Only for Done Status */}

                                                        {/* Receipt Upload UI - Only for Done Status */}
                                                        {txn.status === 'Done' && (
                                                            <>
                                                                {txn.uploadId ? (
                                                                    <DropdownMenu open={openMenuId === txn.id} onOpenChange={(open) => setOpenMenuId(open ? txn.id : null)}>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full"
                                                                                title="Receipt Uploaded (Click to View, Right-click to Delete)"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setUploadModalState({ isOpen: true, txn: txn });
                                                                                }}
                                                                                onContextMenu={(e) => {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    setOpenMenuId(txn.id);
                                                                                }}
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuLabel>Receipt Actions</DropdownMenuLabel>
                                                                            <DropdownMenuSeparator />
                                                                            {txn.isFileAvailable !== false ? (
                                                                                <>
                                                                                    <DropdownMenuItem onClick={() => window.open(`/api/files/${txn.uploadId}`, '_blank')}>
                                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                                        <span>View Receipt</span>
                                                                                    </DropdownMenuItem>
                                                                                    <DropdownMenuItem onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const link = document.createElement('a');
                                                                                        link.href = `/api/files/${txn.uploadId}`;
                                                                                        link.download = txn.uploadId;
                                                                                        document.body.appendChild(link);
                                                                                        link.click();
                                                                                        document.body.removeChild(link);
                                                                                    }}>
                                                                                        <Download className="mr-2 h-4 w-4" />
                                                                                        <span>Download Receipt</span>
                                                                                    </DropdownMenuItem>
                                                                                </>
                                                                            ) : (
                                                                                <DropdownMenuItem disabled className="text-muted-foreground italic text-xs">
                                                                                    File no longer available
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            <DropdownMenuItem onClick={() => setUploadModalState({ isOpen: true, txn: txn })}>
                                                                                <Upload className="mr-2 h-4 w-4" />
                                                                                <span>Re-upload Receipt</span>
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleReceiptUnlink(txn);
                                                                                    setOpenMenuId(null);
                                                                                }}
                                                                            >
                                                                                <Unlink className="w-4 h-4 mr-2" />
                                                                                Unlink Receipt
                                                                            </DropdownMenuItem>
                                                                            {txn.isFileAvailable !== false && (
                                                                                <DropdownMenuItem
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleReceiptDeleteFile(txn);
                                                                                        setOpenMenuId(null);
                                                                                    }}
                                                                                    className="text-red-600 focus:text-red-700 focus:bg-red-50"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                                                    Delete File
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                ) : (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                                                                        title="Link Receipt"
                                                                        onClick={(e) => { e.stopPropagation(); setUploadModalState({ isOpen: true, txn: txn }); }}
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                                                    </Button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {isExpanded && (
                                                <TableRow className="bg-muted/30 border-b animate-in fade-in zoom-in-95 duration-200">
                                                    <TableCell colSpan={7} className="p-4">
                                                        <StatusTimeline order={txn} type="bill-payment" />
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                            {loading && page > 0 && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={7} className="py-4 text-center">
                                        <div className="text-sm text-muted-foreground animate-pulse flex items-center justify-center gap-2">
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

            <BillPaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleTransactionSaved}
            />

            <ReceiptUploadModal
                isOpen={uploadModalState.isOpen}
                onClose={() => setUploadModalState({ isOpen: false, txn: null })}
                onUpload={handleReceiptUpload}
                initialFileId={uploadModalState.txn?.uploadId}
                source="Bill Payment"
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
