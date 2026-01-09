
import React, { useState, useEffect, useMemo } from "react";
import { FilterHeader, useViewMode } from "../components/shared/FilterHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Image as ImageIcon, Loader2, Download, RefreshCw, Upload, UserPlus, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Filter, Trash2 } from "lucide-react";
import { LinkCustomerModal } from "../components/shared/LinkCustomerModal";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "react-router-dom";

import { SimpleAlert } from "../components/shared/SimpleAlert";

import { FileViewer } from "../components/shared/FileViewer";
import { CopyButton } from "@/components/shared/CopyButton";
import { UnifiedUploadModal } from "../components/shared/UnifiedUploadModal";

import { configurationService } from "../services/configurationService";

export default function Uploads() {
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploads, setUploads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewerFileId, setViewerFileId] = useState(null);
    const [showStorageAlert, setShowStorageAlert] = useState(false);
    const [configValues, setConfigValues] = useState({});
    const [deleteDays, setDeleteDays] = useState("N/A");
    const [dialogState, setDialogState] = useState({
        open: false,
        title: "",
        description: "",
        type: "alert", // alert, confirm, prompt
        inputValue: "",
        onConfirm: null
    });

    const showAlert = (title, description) => {
        setDialogState({
            open: true,
            title,
            description,
            type: "alert",
            onConfirm: null
        });
    };

    const confirmAction = (title, description, onConfirm) => {
        setDialogState({
            open: true,
            title,
            description,
            type: "confirm",
            onConfirm
        });
    };

    const promptAction = (title, description, placeholder, onConfirm) => {
        setDialogState({
            open: true,
            title,
            description,
            type: "prompt",
            inputValue: "", // Reset input
            placeholder,
            onConfirm: () => onConfirm(dialogStateRef.current.inputValue) // Use ref or access state? State access inside closure might be stale.
            // Better approach: Make SimpleAlert pass value back or use effect?
            // Actually, `inputValue` is controlled by `dialogState`.
            // The `onConfirm` closure needs access to the LATEST `inputValue`.
        });
    };

    // Ref to access latest input value inside callbacks
    const dialogStateRef = React.useRef(dialogState);
    useEffect(() => {
        dialogStateRef.current = dialogState;
    }, [dialogState]);


    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useViewMode("uploads-view-mode");

    const [dateRange, setDateRange] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const today = `${year}-${month}-${day}`;
        return { start: today, end: today };
    });
    const [excludedSources, setExcludedSources] = useState([]);

    const distinctSources = useMemo(() => {
        const sources = new Set(uploads.map(u => u.uploadedFrom || "System"));
        return Array.from(sources).sort();
    }, [uploads]);

    useEffect(() => {
        fetchUploads();
        fetchConfig();
        handleCheckAvailability(true); // Auto-check on mount
    }, []);

    const fetchConfig = async () => {
        try {
            const values = await configurationService.getValues();
            // Assuming values is an array of {key, value} objects as typical in this app's pattern
            // Or if it returns an object directly. Let's assume array based on service code "Array.isArray(response)".
            const daysConfig = values.find(v => v.key === "FILE_ABSOLUTE_DELETE_DAYS");
            if (daysConfig) {
                setDeleteDays(daysConfig.value);
            }
            setConfigValues(values);
        } catch (e) {
            console.error("Failed to fetch config", e);
        }
    };

    const fetchUploads = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/files");
            if (res.ok) {
                const data = await res.json();
                setUploads(data);
            }
        } catch (error) {
            console.error("Failed to fetch uploads", error);
        } finally {
            setLoading(false);
        }
    };

    // Check Response Helper
    const checkResponse = async (res) => {
        if (res.status === 503) {
            const text = await res.text();
            if (text.includes("STORAGE_PATH_NOT_CONFIGURED") || (tryParseJson(text))?.error === "STORAGE_PATH_NOT_CONFIGURED") {
                setShowStorageAlert(true);
                return false;
            }
        }
        return true;
    };

    // Helper to safely parse JSON
    const tryParseJson = (str) => {
        try { return JSON.parse(str); } catch (e) { return null; }
    };

    const [isDragging, setIsDragging] = useState(false);

    // Sequential Upload Helper
    const uploadFiles = async (files) => {
        if (!files || files.length === 0) return;

        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        // Loop sequentially to prevent ID Race Conditions on Backend
        for (const file of files) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("source", "Uploads");

            try {
                const res = await fetch("/api/files/upload", {
                    method: "POST",
                    body: formData
                });

                if (!await checkResponse(res)) {
                    failCount++;
                    continue; // Stop if storage issue? Or try next? checkResponse handles alert.
                }

                if (res.ok) {
                    successCount++;
                } else {
                    failCount++;
                    console.error("Upload failed for", file.name);
                }
            } catch (error) {
                console.error("Error uploading", file.name, error);
                failCount++;
            }
        }

        if (successCount > 0) {
            fetchUploads();
        }

        if (failCount > 0 && successCount === 0) {
            showAlert("Upload Failed", `Failed to upload ${failCount} file(s).`);
        } else if (failCount > 0) {
            showAlert("Upload Incomplete", `Uploaded ${successCount} files. Failed to upload ${failCount} files.`);
        }

        setLoading(false);
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        await uploadFiles(files);
        e.target.value = ""; // Reset input
    };

    // Drag and Drop Handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        if (e.currentTarget.contains(e.relatedTarget)) return; // Ignor child elements
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files || []);
        // Filter types matches Photo Orders (Images + PDF)
        const validFiles = files.filter(f =>
            f.type.startsWith("image/") || f.type === "application/pdf"
        );

        if (validFiles.length < files.length) {
            showAlert("Files Skipped", `Skipped ${files.length - validFiles.length} unsupported file(s). Only Images and PDFs are allowed.`);
        }

        await uploadFiles(validFiles);
    };

    const handleDateChange = (type, value) => {
        if (type === 'range') {
            setDateRange(value);
            return;
        }
        setDateRange(prev => ({ ...prev, [type]: value }));
    };

    const handleDownload = async (filename, originalName) => {
        try {
            const response = await fetch(`/api/files/${filename}`);
            if (!await checkResponse(response)) return; // Check storage error
            if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename; // Enforce Generated ID + Ext
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Download error:", e);
            // alert("Failed to download file.");
        }
    };

    // Sorting
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };




    const handleCheckAvailability = async (silent = false) => {
        const runCheck = async () => {
            // Don't show global loading for background check if silent
            if (!silent) setLoading(true);

            try {
                const res = await fetch("/api/files/check-availability", { method: "POST" });

                // Check for Blocking Storage Alert
                if (!await checkResponse(res)) return;

                if (res.ok) {
                    const data = await res.json();
                    if (!silent) {
                        showAlert("Check Complete", `Available: ${data.available}\nMissing: ${data.missing}`);
                    }
                    fetchUploads(); // Reload list to show updated status
                } else {
                    const text = await res.text();
                    console.error("Availability Check Failed:", text);
                    if (!silent) showAlert("Check Failed", "Failed to check availability: " + (res.statusText || "Unknown Error"));
                }
            } catch (e) {
                console.error("Availability Check Error:", e);
                if (!silent) showAlert("Error", "Availability check failed: " + e.message);
            } finally {
                if (!silent) setLoading(false);
            }
        };

        if (silent) {
            runCheck();
        } else {
            confirmAction("Check Availability", "Start checking file availability for all uploads? This depends on disk speed.", runCheck);
        }
    };

    // Style constants based on viewMode
    const paddingClass = viewMode === "compact" ? "p-2" : "p-4";
    const headClass = `font-medium text-muted-foreground ${paddingClass}`;

    const handleRecover = (upload) => {
        setDialogState({
            open: true,
            title: "Recover File",
            description: "Enter specific remarks for this recovery:",
            type: "prompt",
            inputValue: "",
            placeholder: "e.g., Recovered per request...",
            onConfirm: () => performRecover(upload)
        });
    };

    const performRecover = async (upload) => {
        const remarks = dialogStateRef.current.inputValue;
        // Remarks can be optional or required? User usually prompts optional but UI might enforce.
        // Let's assume optional based on original code.

        setDialogState(prev => ({ ...prev, open: false })); // Close dialog
        setLoading(true);
        try {
            // API call to recover
            const formData = new FormData();
            formData.append("remarks", remarks);

            const res = await fetch(`/api/files/recover/${upload.uploadId}`, {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                showAlert("Recovery Successful", "File has been restored.");
                fetchUploads();
            } else {
                const text = await res.text();
                showAlert("Recovery Failed", "Failed to recover file: " + text);
            }
        } catch (e) {
            console.error("Recovery error:", e);
            showAlert("Error", "Failed to recover file.");
        } finally {
            setLoading(false);
        }
    };


    const handleDeleteFile = (upload) => {
        confirmAction("Delete File", `Are you sure you want to delete ${upload.uploadId}?`, () => {
            // After Confirm, show Prompt
            setTimeout(() => { // Timeout to allow modal transition if needed, or just state update
                setDialogState({
                    open: true,
                    title: "Delete Remarks",
                    description: "Enter remarks for deletion (optional):",
                    type: "prompt",
                    inputValue: "",
                    placeholder: "e.g., Deleted due to...",
                    onConfirm: () => performDelete(upload)
                });
            }, 100);
        });
    };

    const performDelete = async (upload) => {
        const remarks = dialogStateRef.current.inputValue;
        setDialogState(prev => ({ ...prev, open: false }));

        setLoading(true);
        try {
            const res = await fetch(`/api/files/${upload.uploadId}?remarks=${encodeURIComponent(remarks || "")}`, {
                method: "DELETE"
            });

            if (res.ok) {
                showAlert("Deleted", "File marked for deletion.");
                fetchUploads();
            } else {
                showAlert("Error", "Failed to delete file.");
            }
        } catch (e) {
            showAlert("Error", "Failed to delete file.");
        } finally {
            setLoading(false);
        }
    };

    // ... (Existing code for Drag & Drop, etc.)


    // Sorting Logic Update
    const sortedUploads = useMemo(() => {
        // ... (Existing Filters)
        let filtered = uploads || [];
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(u =>
                u.uploadId?.toLowerCase().includes(lowerQuery) ||
                u.originalFilename?.toLowerCase().includes(lowerQuery) ||
                (u.customerIds && u.customerIds.some(id => String(id).includes(lowerQuery)))
            );
        }

        if (dateRange.start || dateRange.end) {
            filtered = filtered.filter(u => {
                if (!u.createdAt) return false;
                const createdDate = u.createdAt.split('T')[0];

                if (dateRange.start && createdDate < dateRange.start) return false;
                if (dateRange.end && createdDate > dateRange.end) return false;
                return true;
            });
        }
        if (excludedSources.length > 0) {
            filtered = filtered.filter(u => !excludedSources.includes(u.uploadedFrom || "System"));
        }

        if (sortConfig.key) {
            filtered = [...filtered].sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                if (aValue === null) aValue = "";
                if (bValue === null) bValue = "";

                if (sortConfig.key === 'createdAt') {
                    return sortConfig.direction === 'asc'
                        ? new Date(aValue) - new Date(bValue)
                        : new Date(bValue) - new Date(aValue);
                }

                if (sortConfig.key === 'uploadedFrom') {
                    aValue = aValue || "System";
                    bValue = bValue || "System";
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [uploads, searchQuery, dateRange, excludedSources, sortConfig]);




    return (
        <div
            className="flex flex-col h-full bg-background animate-in fade-in duration-500 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* ... (Existing Overlay) ... */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-[2px] border-4 border-dashed border-primary m-4 rounded-xl flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-300">
                    <div className="bg-background/90 p-8 rounded-full shadow-2xl flex flex-col items-center gap-4">
                        <Upload className="w-12 h-12 text-primary animate-bounce" />
                        <h3 className="text-xl font-bold text-primary">Drop files to upload</h3>
                    </div>
                </div>
            )}





            <FilterHeader
                title="Uploads"
                dateRange={dateRange}
                onDateChange={handleDateChange}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            >
                {/* ... (Existing Buttons) ... */}
                <Button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="h-9 gap-2"
                    size="sm"
                >
                    <Upload className="h-4 w-4" />
                    Upload / Link Customer
                </Button>



                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-2">
                            <Filter className="h-4 w-4" />
                            Filters
                            {excludedSources.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                                    Active
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-4">
                        <div className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground pb-2 border-b">Filter by Source</h4>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {distinctSources.map(source => (
                                    <label key={source} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            checked={!excludedSources.includes(source)}
                                            onChange={() => {
                                                setExcludedSources(prev =>
                                                    prev.includes(source)
                                                        ? prev.filter(s => s !== source)
                                                        : [...prev, source]
                                                );
                                            }}
                                            className="w-4 h-4 rounded border-input"
                                        />
                                        <span className="truncate" title={source}>{source}</span>
                                    </label>
                                ))}
                            </div>
                            {distinctSources.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">No sources found.</p>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </FilterHeader>

            <div className={`p-6 flex-1 flex flex-col min-h-0`}>
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm flex-1 flex flex-col min-h-0">
                    <Table containerClassName="flex-1 overflow-auto h-full">
                        <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                            <TableRow className="hover:bg-transparent border-b">
                                <TableHead className={`w-[80px] ${headClass}`}>File</TableHead>
                                <TableHead className={`${headClass} cursor-pointer hover:text-foreground transition-colors`} onClick={() => handleSort('uploadId')}>
                                    <div className="flex items-center gap-1">
                                        Upload ID
                                        {sortConfig.key === 'uploadId' && (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </div>
                                </TableHead>
                                <TableHead className={`${headClass} cursor-pointer hover:text-foreground transition-colors`} onClick={() => handleSort('originalFilename')}>
                                    <div className="flex items-center gap-1">
                                        Original Filename
                                        {sortConfig.key === 'originalFilename' && (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </div>
                                </TableHead>
                                <TableHead className={`${headClass} cursor-pointer hover:text-foreground transition-colors`} onClick={() => handleSort('uploadPath')}>
                                    <div className="flex items-center gap-1">
                                        Path
                                        {sortConfig.key === 'uploadPath' && (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </div>
                                </TableHead>
                                <TableHead className={`${headClass} cursor-pointer hover:text-foreground transition-colors`} onClick={() => handleSort('createdAt')}>
                                    <div className="flex items-center gap-1">
                                        Date
                                        {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </div>
                                </TableHead>

                                <TableHead className={`${headClass}`}>Remarks</TableHead>
                                <TableHead className={headClass}>Linked To</TableHead>
                                <TableHead className={`text-right ${headClass} cursor-pointer hover:text-foreground transition-colors`} onClick={() => handleSort('uploadedFrom')}>
                                    <div className="flex items-center justify-end gap-1">
                                        Source
                                        {sortConfig.key === 'uploadedFrom' && (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </div>
                                </TableHead>
                                <TableHead className={`text-center w-[80px] ${headClass} cursor-pointer hover:text-foreground transition-colors`} onClick={() => handleSort('isAvailable')}>
                                    <div className="flex items-center justify-center gap-1">
                                        Avail.
                                        {sortConfig.key === 'isAvailable' && (sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </div>
                                </TableHead>
                                <TableHead className={`text-center w-[80px] ${headClass}`}>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Loading uploads...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : sortedUploads.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                                        No uploads found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedUploads.map((upload) => {
                                    const isPdf = upload.extension === '.pdf' || upload.originalFilename?.toLowerCase().endsWith('.pdf');
                                    const fileServeId = upload.uploadId + (upload.extension || '');
                                    const isMarkDeleted = upload.markDeleted;

                                    return (
                                        <TableRow key={upload.uploadId} className="hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-colors">
                                            <TableCell className={`${paddingClass} align-middle`}>
                                                <div
                                                    className={`${viewMode === 'compact' ? 'w-8 h-8' : 'w-12 h-12'} rounded-md overflow-hidden border bg-muted flex items-center justify-center cursor-zoom-in relative group`}
                                                    onClick={() => setViewerFileId(fileServeId)}
                                                >
                                                    {isPdf ? (
                                                        <FileText className={`${viewMode === 'compact' ? 'h-5 w-5' : 'h-6 w-6'} text-red-500`} />
                                                    ) : (
                                                        <img
                                                            src={`/api/files/${fileServeId}`}
                                                            alt={upload.originalFilename}
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
                                                                handleDownload(fileServeId, upload.originalFilename);
                                                            }}
                                                            title="Download File"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className={`${paddingClass} font-medium font-mono text-xs`}>
                                                <div className="flex items-center gap-2 group/id">
                                                    {upload.uploadId}
                                                    <CopyButton
                                                        text={upload.uploadId}
                                                        className="h-6 w-6 opacity-0 group-hover/id:opacity-100 transition-opacity"
                                                        title="Copy Upload ID"
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className={`${paddingClass} max-w-[200px] truncate`} title={upload.originalFilename}>
                                                {upload.originalFilename}
                                            </TableCell>
                                            <TableCell className={`${paddingClass} max-w-[250px] truncate text-xs text-muted-foreground`} title={upload.uploadPath}>
                                                {upload.uploadPath || "-"}
                                            </TableCell>
                                            <TableCell className={`${paddingClass} text-muted-foreground`}>
                                                {upload.createdAt ? format(new Date(upload.createdAt), "dd MMM yyyy") : "-"}
                                            </TableCell>

                                            <TableCell className={`${paddingClass}`}>
                                                <textarea
                                                    readOnly
                                                    className="w-[200px] h-16 p-1 text-xs bg-muted/50 rounded border-none resize-none focus:ring-0 text-muted-foreground"
                                                    value={upload.remarks || ""}
                                                />
                                            </TableCell>
                                            <TableCell className={paddingClass}>
                                                {upload.customerIds && upload.customerIds.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {[...new Set(upload.customerIds)].map((id, index) => (
                                                            <Badge key={`${id}-${index}`} variant="outline" className="text-xs font-mono bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100">
                                                                {id}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">Unlinked</span>
                                                )}
                                            </TableCell>
                                            <TableCell className={`${paddingClass} text-right`}>
                                                <Badge variant="outline">{upload.uploadedFrom || "-"}</Badge>
                                            </TableCell>
                                            <TableCell className={`${paddingClass} text-center`}>
                                                <div className="flex justify-center" title={
                                                    isMarkDeleted ? "Marked for Deletion" :
                                                        upload.isAvailable === null ? "Not Checked" :
                                                            (upload.isAvailable ? "Available on Disk" : "Missing from Disk")
                                                }>
                                                    <div className={`w-3 h-3 rounded-full ${isMarkDeleted ? "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]" :
                                                        upload.isAvailable === true ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                                                            upload.isAvailable === false ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" :
                                                                "bg-gray-300 dark:bg-gray-600"
                                                        }`} />
                                                </div>
                                            </TableCell>
                                            <TableCell className={`${paddingClass} text-center`}>
                                                {isMarkDeleted ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRecover(upload);
                                                        }}
                                                        className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                    >
                                                        Recover
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteFile(upload);
                                                        }}
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                                        title="Delete File"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <FileViewer
                fileId={viewerFileId}
                isOpen={!!viewerFileId}
                onClose={() => setViewerFileId(null)}
            />

            <LinkCustomerModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                onSuccess={() => {
                    fetchUploads();
                }}
            />

            <UnifiedUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={() => {
                    fetchUploads();
                    showAlert("Upload Successful", "File uploaded and processed.");
                }}
            />

            {showStorageAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-background border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3 text-destructive">
                            <AlertCircle className="h-8 w-8" />
                            <h2 className="text-xl font-semibold">Storage Not Configured</h2>
                        </div>
                        <p className="text-muted-foreground">
                            The requested file operation cannot be completed required <code>STORAGE_PATH</code> configuration is missing.
                        </p>
                        <p className="text-sm font-medium">
                            Please configure the storage path to a valid directory on the server (e.g., <code>F:/Project/uploads/</code>).
                        </p>
                        <div className="pt-2 flex justify-end">
                            <Link to="/configuration">
                                <Button onClick={() => setShowStorageAlert(false)}>
                                    Go to Configuration
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            <SimpleAlert
                open={dialogState.open}
                onOpenChange={(open) => setDialogState(prev => ({ ...prev, open }))}
                title={dialogState.title}
                description={dialogState.description}
                type={dialogState.type}
                inputValue={dialogState.inputValue}
                onInputChange={(val) => setDialogState(prev => ({ ...prev, inputValue: val }))}
                onConfirm={dialogState.onConfirm}
                placeholder={dialogState.placeholder}
            />
        </div>
    );
}
