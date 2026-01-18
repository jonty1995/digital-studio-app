import React, { useState, useEffect, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, Search, Trash2, Unlink, Eye, Download, Upload, Loader2, Send } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FilterHeader, useViewMode } from "@/components/shared/FilterHeader";
import { OrderStatus } from "@/components/shared/OrderStatus";
import { StatusTimeline } from "@/components/shared/StatusTimeline";
import { cn } from "@/lib/utils";
import { MoneyTransferModal } from "@/components/shared/MoneyTransferModal";
import { ReceiptUploadModal } from "@/components/shared/ReceiptUploadModal";
import { moneyTransferService } from "@/services/moneyTransferService";
import { configurationService } from "@/services/configurationService";
import { fileService } from "@/services/fileService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { CopyButton } from "@/components/shared/CopyButton";

export default function MoneyTransfer() {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploadModalState, setUploadModalState] = useState({ isOpen: false, txn: null });
    const [expandedTransferId, setExpandedTransferId] = useState(null);
    const [selectedTransferId, setSelectedTransferId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [scrollBlockSize, setScrollBlockSize] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const observer = useRef();
    const [viewMode, setViewMode] = useViewMode("money-transfer-view-mode");
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "" });
    const showAlert = (title, message) => setAlertConfig({ isOpen: true, title, message });

    const [page, setPage] = useState(0);
    const [dateRange, setDateRange] = useState({ start: "", end: "" });
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({ UPI: true, ACCOUNT: true });

    const handleFilterChange = (key) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

    const lastElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) setPage(p => p + 1);
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    useEffect(() => {
        const fetchConfig = async () => {
            const vals = await configurationService.getValues();
            const size = vals.find(v => v.name === "SCROLL_BLOCK_SIZE");
            if (size) setScrollBlockSize(parseInt(size.value));
        };
        fetchConfig();
    }, []);

    const fetchTransfers = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            const activeTypes = Object.keys(filters).filter(k => filters[k]);
            const params = {
                page, size: scrollBlockSize,
                startDate: dateRange.start, endDate: dateRange.end,
                search: searchQuery, types: activeTypes
            };
            const data = await moneyTransferService.getAll(params);
            setTransfers(prev => {
                const combined = page === 0 ? data.content : [...prev, ...data.content];
                return Array.from(new Map(combined.map(i => [i.id, i])).values());
            });
            setHasMore(!data.last && data.content.length > 0);
            setTotalItems(data.totalElements);
        } catch (e) {
            console.error(e);
            if (!isBackground) showAlert("Error", "Failed to load transfers.");
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => { setPage(0); }, [dateRange, searchQuery, filters]);
    useEffect(() => { fetchTransfers(); }, [page, dateRange, searchQuery, filters]);

    const handleSaved = async (payload, file) => {
        if (file) {
            const upload = await fileService.upload(file, "Money Transfer");
            payload.uploadId = upload.uploadId;
        }
        await moneyTransferService.create(payload);
        fetchTransfers();
        setIsModalOpen(false);
        showAlert("Success", "Transfer created successfully.");
    };

    const handleReceiptUpload = async (uploadId) => {
        if (!uploadModalState.txn) return;
        try {
            await moneyTransferService.update(uploadModalState.txn.id, { uploadId });
            setUploadModalState({ isOpen: false, txn: null });
            fetchTransfers(true); // Silent refresh
            showAlert("Success", "Receipt linked successfully.");
        } catch (error) {
            console.error("Failed to link receipt:", error);
            showAlert("Error", "Failed to link receipt.");
        }
    };

    const handleReceiptUnlink = async (txn) => {
        try {
            await moneyTransferService.update(txn.id, { uploadId: null });
            fetchTransfers(true); // Silent refresh
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
            await moneyTransferService.update(txn.id, { uploadId: null });

            // 2. Delete file
            await fileService.delete(txn.uploadId, remarks);

            fetchTransfers(true); // Silent refresh
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
            const source = "Money Transfer";
            const uploadResponse = await fileService.upload(file, source);
            await moneyTransferService.update(txn.id, { uploadId: uploadResponse.uploadId });
            fetchTransfers(true); // Silent refresh
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

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <FilterHeader
                title="Money Transfer"
                dateRange={dateRange}
                onDateChange={(t, v) => setDateRange(prev => t === 'range' ? v : { ...prev, [t]: v })}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                action={<Button size="sm" onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" />New Transfer</Button>}
            >
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={filters.UPI} onChange={() => handleFilterChange("UPI")} className="accent-primary" />UPI</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={filters.ACCOUNT} onChange={() => handleFilterChange("ACCOUNT")} className="accent-primary" />Account</label>
            </FilterHeader>

            <div className="flex-1 p-6 pt-0 flex flex-col min-h-0">
                <div className="rounded-md border bg-card flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                            <TableRow>
                                <TableHead className="w-[130px]">Date</TableHead>
                                <TableHead className="w-[100px]">Type</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Recipient Info</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Receipt</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transfers.map((t, i) => {
                                const pClass = viewMode === 'compact' ? 'p-2' : 'p-4';
                                const hClass = viewMode === 'compact' ? 'h-10' : '';
                                const isExpanded = expandedTransferId === t.id;

                                return (
                                    <React.Fragment key={t.id}>
                                        <TableRow
                                            ref={i === transfers.length - 1 ? lastElementRef : null}
                                            className={cn(
                                                "cursor-pointer border-b transition-colors outline-none focus:bg-blue-50/50",
                                                hClass,
                                                isExpanded ? "bg-muted/50" : "hover:bg-gray-100/60 dark:hover:bg-gray-800/60",
                                                selectedTransferId === t.id ? "bg-blue-50/30" : ""
                                            )}
                                            tabIndex={0}
                                            onClick={() => {
                                                setExpandedTransferId(isExpanded ? null : t.id);
                                                setSelectedTransferId(t.id);
                                            }}
                                            onPaste={(e) => handleRowPaste(e, t)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleRowDrop(e, t)}
                                        >
                                            <TableCell className={`${pClass} align-middle font-medium`}>{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell className={`${pClass} align-middle`}><Badge variant="outline">{t.transferType}</Badge></TableCell>
                                            <TableCell className={`${pClass} align-middle`}>{t.customer?.name || "-"}</TableCell>
                                            <TableCell className={`${pClass} align-middle`}>
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-medium">{t.recipientName}</span>
                                                    <span className="text-muted-foreground text-xs">
                                                        {t.transferType === 'UPI' ? (t.upiId || t.mobileNumber) : `${t.bankName} - ${t.accountNumber}`}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className={`${pClass} align-middle font-semibold`}>₹{t.amount?.toFixed(2)}</TableCell>
                                            <TableCell className={`${pClass} align-middle`}>
                                                <OrderStatus order={t} type="money-transfer" updateFn={moneyTransferService.updateStatus} onUpdate={() => fetchTransfers(true)} />
                                            </TableCell>
                                            <TableCell className="align-middle">
                                                <div className="flex items-center gap-2">
                                                    {t.status === 'Done' && (
                                                        <>
                                                            {t.uploadId ? (
                                                                <DropdownMenu open={openMenuId === t.id} onOpenChange={(open) => setOpenMenuId(open ? t.id : null)}>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-full"
                                                                            title="Receipt Uploaded (Click to View, Right-click to Delete)"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setUploadModalState({ isOpen: true, txn: t });
                                                                            }}
                                                                            onContextMenu={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setOpenMenuId(t.id);
                                                                            }}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuLabel>Receipt Actions</DropdownMenuLabel>
                                                                        <DropdownMenuSeparator />
                                                                        {t.isFileAvailable !== false ? (
                                                                            <>
                                                                                <DropdownMenuItem onClick={() => window.open(`/api/files/${t.uploadId}`, '_blank')}>
                                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                                    <span>View Receipt</span>
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const link = document.createElement('a');
                                                                                    link.href = `/api/files/${t.uploadId}`;
                                                                                    link.download = t.uploadId;
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
                                                                        <DropdownMenuItem onClick={() => setUploadModalState({ isOpen: true, txn: t })}>
                                                                            <Upload className="mr-2 h-4 w-4" />
                                                                            <span>Re-upload Receipt</span>
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleReceiptUnlink(t);
                                                                                setOpenMenuId(null);
                                                                            }}
                                                                        >
                                                                            <Unlink className="w-4 h-4 mr-2" />
                                                                            Unlink Receipt
                                                                        </DropdownMenuItem>
                                                                        {t.isFileAvailable !== false && (
                                                                            <DropdownMenuItem
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleReceiptDeleteFile(t);
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
                                                                    onClick={(e) => { e.stopPropagation(); setUploadModalState({ isOpen: true, txn: t }); }}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {expandedTransferId === t.id && (
                                            <TableRow className="bg-muted/30">
                                                <TableCell colSpan={7} className="p-4">
                                                    <StatusTimeline order={t} type="money-transfer" />
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

            <MoneyTransferModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaved} />
            <ReceiptUploadModal
                isOpen={uploadModalState.isOpen}
                onClose={() => setUploadModalState({ isOpen: false, txn: null })}
                onUpload={handleReceiptUpload}
                initialFileId={uploadModalState.txn?.uploadId}
                source="Money Transfer"
            />
            <SimpleAlert open={alertConfig.isOpen} onOpenChange={o => setAlertConfig(p => ({ ...p, isOpen: o }))} title={alertConfig.title} description={alertConfig.message} />
        </div>
    );
}
