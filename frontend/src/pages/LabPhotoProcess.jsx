import React, { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Play, Loader2, Calendar, FileText, Search, Trash2, X, Eye } from "lucide-react";
import { LabPhotoGroup } from "@/components/lab/LabPhotoGroup";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useEmail } from "@/contexts/EmailContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { DateUtils } from "@/utils/DateUtils";
import * as labService from "@/services/labProcessService";
import { configurationService } from "@/services/configurationService";

export default function LabPhotoProcess() {
    const [activeTab, setActiveTab] = useState("Action"); // Action or History
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    
    // Config Data
    const [allPhotoItems, setAllPhotoItems] = useState([]);
    const [allAddons, setAllAddons] = useState([]);
    const [pricingRules, setPricingRules] = useState([]);
    
    // Setup Phase
    const [showSetup, setShowSetup] = useState(false);
    const [selectedItemIds, setSelectedItemIds] = useState([]);
    const [manualGroupName, setManualGroupName] = useState("");

    // Email Confirmation Phase
    const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
    const [emailQueue, setEmailQueue] = useState([]);
    const [recipientEmails, setRecipientEmails] = useState([]);
    const [emailInputValue, setEmailInputValue] = useState("");
    const [editingEmailIndex, setEditingEmailIndex] = useState(-1);

    const [alert, setAlert] = useState({ open: false, title: "", message: "", onConfirm: null, folderExists: false });
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Logs related state
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState(DateUtils.formatForInput(new Date()));
    const [todayLog, setTodayLog] = useState(null);
    const [previewEmailImage, setPreviewEmailImage] = useState(null);
    const emailInputRef = useRef(null);

    const showAlert = (title, message, onConfirm = null) => {
        setAlert({ open: true, title, message, onConfirm, folderExists: alert.folderExists });
    };

    const loadConfigs = async () => {
        setLoading(true);
        try {
            const [items, addons, rules, values] = await Promise.all([
                configurationService.getItems(),
                configurationService.getAddons(),
                configurationService.getPricingRules(),
                configurationService.getValues()
            ]);
            
            setAllPhotoItems(items);
            setAllAddons(addons);
            setPricingRules(rules);

            const recipientConfig = values.find(item => item.name === "EMAIL_RECIPIENT");
            if (recipientConfig && recipientConfig.value) {
                setRecipientEmails(recipientConfig.value.split(",").map(e => e.trim()).filter(Boolean));
            }

            // If no active groups and not loading logs yet, show setup
            if (groups.length === 0) {
                setShowSetup(true);
            }
        } catch (error) {
            console.error("Failed to load configs", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const data = await labService.fetchLabProcessLogs();
            if (data) {
                setLogs(data);
                
                const parseLogDate = (ts) => {
                    if (Array.isArray(ts)) {
                        return `${ts[0]}-${String(ts[1]).padStart(2, '0')}-${String(ts[2]).padStart(2, '0')}`;
                    }
                    return DateUtils.formatForInput(new Date(ts));
                };

                const todayStr = DateUtils.formatForInput(new Date());
                const generatedToday = data.find(log => 
                    log.action === "Generated" && 
                    parseLogDate(log.timestamp) === todayStr
                );
                
                if (generatedToday) {
                    setTodayLog(generatedToday);
                    
                    // PREPOPULATE: Try to reconstruct groups from JSON
                    try {
                        const structured = JSON.parse(generatedToday.fileListJson);
                        if (Array.isArray(structured)) {
                            const reconstructedGroups = structured.map((g, idx) => ({
                                id: Date.now() + idx,
                                name: g.name,
                                photoItemId: g.photoItemId,
                                photoItemName: g.photoItemName,
                                manualAddons: g.manualAddons || [],
                                files: g.files.map(f => ({
                                    file: null, 
                                    name: f.originalName,
                                    selectedAddons: f.selectedAddons || []
                                }))
                            }));
                            setGroups(reconstructedGroups);
                            setShowSetup(false);
                        }
                    } catch (e) {
                        console.log("Not a structured log, skipping prepopulation");
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        loadConfigs();
        fetchLogs();
    }, []);

    const handleSetupDone = () => {
        // 1. Keep all manual groups (those without a photoItemId)
        const manualGroups = groups.filter(g => g.photoItemId === null);
        
        // 2. Identify existing item-based groups to keep
        const itemGroupsToKeep = groups.filter(g => g.photoItemId !== null && selectedItemIds.includes(g.photoItemId));
        
        // 3. Create new groups for newly selected items
        const currentItemIds = itemGroupsToKeep.map(g => g.photoItemId);
        const newItemIds = selectedItemIds.filter(id => !currentItemIds.includes(id));
        
        const newGroups = newItemIds.map((id, idx) => {
            const item = allPhotoItems.find(i => i.id === id);
            return {
                id: Date.now() + idx + Math.random(),
                name: item.name,
                photoItemId: item.id,
                photoItemName: item.name,
                manualAddons: [],
                files: []
            };
        });

        const finalGroups = [...manualGroups, ...itemGroupsToKeep, ...newGroups];

        if (finalGroups.length === 0) {
            showAlert("Selection Required", "Please select at least one photo item or add a manual group.");
            return;
        }

        setGroups(finalGroups);
        setShowSetup(false);
    };

    const openSetup = () => {
        const itemIds = groups
            .filter(g => g.photoItemId !== null)
            .map(g => g.photoItemId);
        setSelectedItemIds(itemIds);
        setShowSetup(true);
    };

    const addGroup = () => {
        setGroups([...groups, { id: Date.now(), name: "", photoItemId: null, photoItemName: "Manual", manualAddons: [], files: [] }]);
    };

    const removeGroup = (id) => {
        setGroups(groups.filter(g => g.id !== id));
    };

    const updateGroup = (id, updates) => {
        setGroups(groups.map(g => g.id === id ? { ...g, ...updates } : g));
    };

    const handleGenerateClick = async () => {
        const unnamedGroups = groups.filter(g => g.name.trim() === "");
        if (unnamedGroups.length > 0) {
            return showAlert("Missing Group Names", "All groups must have a name before processing.");
        }

        const emptyGroups = groups.filter(g => g.files.length === 0);
        if (emptyGroups.length > 0) {
            return showAlert("Empty Groups", "All groups must contain at least one image.");
        }

        try {
            const today = DateUtils.formatForInput(new Date());
            const data = await labService.checkFolderExists(today);
            if (data) {
                setAlert(prev => ({ ...prev, folderExists: data.exists }));
                setShowConfirmModal(true);
            }
        } catch (error) {
            console.error("Failed to check folder existence", error);
            setShowConfirmModal(true);
        }
    };

    const saveLog = async (action, category = null, recipient = null, batchSummary = null, files = null) => {
        let finalGroupSummary = batchSummary;
        let finalFileList = "";

        if (action === "Generated") {
            finalGroupSummary = groups.map(g => `${g.name}: ${g.files.length}`).join(", ");
            
            const structuredData = groups.map(group => ({
                name: group.name,
                photoItemId: group.photoItemId,
                photoItemName: group.photoItemName,
                manualAddons: group.manualAddons,
                files: group.files.map((f, idx) => ({
                    originalName: f.file ? f.file.name : f.name,
                    renamed: `${group.name}(${idx + 1})`,
                    selectedAddons: f.selectedAddons
                }))
            }));
            finalFileList = JSON.stringify(structuredData);
        } else {
            finalGroupSummary = batchSummary;
            finalFileList = files ? files.map(f => f.name).join(", ") : "";
        }

        try {
            const data = await labService.saveLabProcessLog(
                action,
                category,
                recipient,
                finalGroupSummary,
                finalFileList
            );
            if (data) {
                fetchLogs();
                return data;
            }
        } catch (e) {
            console.error("Failed to save log", e);
        }
        return null;
    };

    const updateLog = async (id, action) => {
        try {
            const success = await labService.updateLabProcessLog(id, action);
            if (success) {
                fetchLogs();
            }
        } catch (e) {
            console.error("Failed to update log", e);
        }
    };

    const deleteLog = async (id) => {
        try {
            const success = await labService.deleteLabProcessLog(id);
            if (success) {
                setLogs(logs.filter(log => log.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete log", error);
        }
    };

    const confirmDelete = (id) => {
        showAlert("Delete Log", "Are you sure you want to delete this log entry? This action cannot be undone.", () => deleteLog(id));
    };

    const buildEmailQueue = async () => {
        try {
            let maxUploadSizeMb = 25;
            try {
                const configData = await configurationService.getValues();
                if (configData) {
                    const sizeConfig = configData.find(c => c.name === "EMAIL_MAX_UPLOAD_SIZE");
                    if (sizeConfig && sizeConfig.value) {
                        maxUploadSizeMb = parseInt(sizeConfig.value, 10) || 25;
                    }
                }
            } catch (e) {
                console.error("Failed to fetch email max size config", e);
            }

            const MAX_EMAIL_SIZE_BYTES = maxUploadSizeMb * 1024 * 1024;
            const HEADER_OVERHEAD_BYTES = 50 * 1024;
            const RAW_FILE_LIMIT_BYTES = Math.floor((MAX_EMAIL_SIZE_BYTES - HEADER_OVERHEAD_BYTES) * 0.75);

            // Group files by unique addon combinations
            const addonGroups = {};

            groups.forEach(group => {
                group.files.filter(f => f.file).forEach((fileObj, index) => {
                    const addons = [...(fileObj.selectedAddons || [])].sort().join(", ") || "Standard";
                    if (!addonGroups[addons]) addonGroups[addons] = [];
                    
                    const extension = fileObj.file.name.substring(fileObj.file.name.lastIndexOf("."));
                    const renamedFile = new File([fileObj.file], `${group.name}(${index + 1})${extension}`, { type: fileObj.file.type });
                    
                    addonGroups[addons].push({ file: renamedFile, groupName: group.name, addons });
                });
            });

            const allEmailBatches = [];

            Object.entries(addonGroups).forEach(([addonKey, catFiles]) => {
                const catBatches = []; 

                catFiles.forEach(item => {
                    let foundBatch = false;
                    for (let batch of catBatches) {
                        const currentBatchSize = batch.reduce((sum, b) => sum + b.file.size, 0);
                        if (currentBatchSize + item.file.size <= RAW_FILE_LIMIT_BYTES) {
                            batch.push(item);
                            foundBatch = true;
                            break;
                        }
                    }
                    if (!foundBatch) catBatches.push([item]);
                });

                catBatches.forEach((batch, bIdx) => {
                    const groupCounts = batch.reduce((acc, item) => {
                        acc[item.groupName] = (acc[item.groupName] || 0) + 1;
                        return acc;
                    }, {});

                    const batchSummaryStr = Object.entries(groupCounts)
                        .map(([name, count]) => `${name} - ${count}`)
                        .join(", ");

                    const batchBodySummary = Object.entries(groupCounts)
                        .map(([name, count]) => `${name} - ${count}`)
                        .join("\n");

                    const fileList = batch.map((item, idx) => `  ${idx + 1}. ${item.file.name}`).join("\n");

                    const categoryTag = addonKey === "Standard" ? "" : ` [${addonKey}]`;
                    const partStr = catBatches.length > 1 ? ` (Part ${bIdx + 1}/${catBatches.length})` : "";
                    
                    const subject = `[${batchSummaryStr}]${categoryTag}${partStr}`;
                    const body = `Category: ${addonKey}\n` +
                        `Summary:\n${batchBodySummary}\n` +
                        `-----------------------\n` +
                        `Files:\n${fileList}`;

                    allEmailBatches.push({
                        recipient: recipientEmails.join(", "),
                        subject,
                        body,
                        categoryName: addonKey,
                        batchSummary: batchSummaryStr,
                        files: batch.map(cf => cf.file)
                    });
                });
            });

            setEmailQueue(allEmailBatches);
        } catch (error) {
            showAlert("Error Preparing Email", error.message);
        }
    };

    const doGenerate = async () => {
        const overwrite = alert.folderExists;
        setShowConfirmModal(false);
        setGenerating(true);
        try {
            const today = DateUtils.formatForInput(new Date());
            for (const group of groups) {
                await labService.generateGroup(group.name, group.files, today);
            }

            await saveLog("Generated");
            await buildEmailQueue();
            setShowEmailConfirmation(true);
        } catch (error) {
            setGenerating(false);
            showAlert("Error", error.message);
        }
    };

    const { sendEmailQueue, progress, status: emailStatus } = useEmail();

    // Sync logs with background email progress
    useEffect(() => {
        if (emailStatus === 'sending' || emailStatus === 'success' || emailStatus === 'error') {
            fetchLogs();
        }
    }, [progress.current, emailStatus]);

    const handleSendMails = async () => {
        // Commit any pending text in the input first
        commitEmailTag();

        if (recipientEmails.length === 0) {
            return showAlert("No Recipients", "Please enter at least one recipient email address.");
        }

        setShowEmailConfirmation(false);
        setGenerating(false);

        // Update queue with combined recipients
        const combinedRecipient = recipientEmails.join(", ");
        const finalQueue = emailQueue.map(q => ({ ...q, recipient: combinedRecipient }));
        sendEmailQueue(finalQueue);

        showAlert("Email Sending Started", "The emails are being sent in the background. You can continue working on other pages.", () => {
            setGroups(prev => prev.map(g => ({ ...g, files: [] })));
        });
    };

    const commitEmailTag = () => {
        const value = emailInputValue.trim();
        if (value && value.includes("@")) {
            if (!recipientEmails.includes(value)) {
                setRecipientEmails([...recipientEmails, value]);
            }
            setEmailInputValue("");
        }
    };

    const handleEmailKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " " || e.key === ",") {
            e.preventDefault();
            commitEmailTag();
        } else if (e.key === "Backspace" && !emailInputValue && recipientEmails.length > 0) {
            setRecipientEmails(recipientEmails.slice(0, -1));
        }
    };

    const removeEmailTag = (index) => {
        setRecipientEmails(recipientEmails.filter((_, i) => i !== index));
    };

    const editEmailTag = (index) => {
        setEmailInputValue(recipientEmails[index]);
        setRecipientEmails(recipientEmails.filter((_, i) => i !== index));
        // Use a small timeout to ensure the input is visible before focusing
        setTimeout(() => emailInputRef.current?.focus(), 50);
    };

    const handleSkipEmail = () => {
        setShowEmailConfirmation(false);
        setGenerating(false);
        // Page will show the groups with selected photos, as requested
    };

    const getLogDate = (timestamp) => {
        if (!timestamp) return "";
        if (typeof timestamp === 'string') return timestamp.split('T')[0];
        if (Array.isArray(timestamp)) {
            return `${timestamp[0]}-${String(timestamp[1]).padStart(2, '0')}-${String(timestamp[2]).padStart(2, '0')}`;
        }
        return DateUtils.formatForInput(timestamp);
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            (log.category && log.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.recipient && log.recipient.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.groupSummary && log.groupSummary.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.fileListJson && log.fileListJson.toLowerCase().includes(searchTerm.toLowerCase()));

        const logDate = getLogDate(log.timestamp);
        const matchesDate = !dateFilter || logDate === dateFilter;
        return matchesSearch && matchesDate;
    });

    const handleRowClick = async (log) => {
        if (log.action === "Generated" || log.action === "IN PROGRESS") {
            try {
                const logDate = getLogDate(log.timestamp);
                await labService.openFolder(logDate, log.id);
            } catch (error) {
                console.error("Failed to open folder", error);
                const errorMsg = error.message.includes("FOLDER_NOT_FOUND")
                    ? "The folder for this batch no longer exists on the disk."
                    : "Failed to communicate with local system.";
                showAlert("Error", errorMsg);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <PageHeader title="Lab Photo Process">
                <div className="flex items-center gap-4">
                    <div className="flex bg-muted rounded-lg p-1 mr-4">
                        <Button
                            variant={activeTab === "Action" ? "secondary" : "ghost"}
                            size="sm"
                            className={`px-4 h-8 transition-all ${activeTab === "Action" ? "shadow-sm font-bold" : "text-muted-foreground"}`}
                            onClick={() => setActiveTab("Action")}
                        >
                            Action
                        </Button>
                        <Button
                            variant={activeTab === "Logs" ? "secondary" : "ghost"}
                            size="sm"
                            className={`px-4 h-8 transition-all ${activeTab === "Logs" ? "shadow-sm font-bold" : "text-muted-foreground"}`}
                            onClick={() => setActiveTab("Logs")}
                        >
                            History
                        </Button>
                    </div>

                    {activeTab === "Action" ? (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="gap-2">
                                        <Plus className="w-4 h-4" /> Add
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={openSetup}>
                                        Add Group
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={addGroup}>
                                        Add Manual Group
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button onClick={handleGenerateClick} disabled={generating} className="gap-2 bg-green-600 hover:bg-green-700 text-white border-none shadow-md">
                                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                {generating ? "Processing..." : "Generate"}
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 border-r pr-4 mr-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    className="w-[160px] h-9"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search logs..."
                                    className="pl-8 w-[250px] h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </PageHeader>

            <div className="p-6 flex-1 overflow-auto">
                {activeTab === "Action" ? (
                    loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-muted-foreground animate-pulse">Loading configurations...</p>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            {todayLog && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shadow-sm">
                                    <div>
                                        <h3 className="text-green-800 font-semibold flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            Today's Batch Already Generated
                                        </h3>
                                        <p className="text-green-700 text-sm mt-1">
                                            A batch was processed at {new Date(todayLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} with summary: <span className="font-medium">{todayLog.groupSummary}</span>
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="border-green-300 text-green-700 hover:bg-green-100"
                                            onClick={() => handleRowClick(todayLog)}
                                        >
                                            Open Folder
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="border-green-300 text-green-700 hover:bg-green-100"
                                            onClick={async () => {
                                                await buildEmailQueue();
                                                setShowEmailConfirmation(true);
                                            }}
                                        >
                                            Send Email
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {groups.map((group, index) => (
                                <LabPhotoGroup
                                    key={group.id}
                                    group={group}
                                    index={index}
                                    onUpdate={updateGroup}
                                    onRemove={removeGroup}
                                    allAddons={allAddons}
                                    pricingRules={pricingRules}
                                />
                            ))}
                            {groups.length === 0 && !showSetup && (
                                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                                    <p className="text-muted-foreground">No groups added. Click "Fresh Setup" to start.</p>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    loadingLogs ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">Loading history...</p>
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto bg-card rounded-xl border shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[180px]">Process Date</TableHead>
                                        <TableHead className="w-[120px]">Action</TableHead>
                                        <TableHead className="w-[180px]">Category</TableHead>
                                        <TableHead>Summary / Recipient</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.length > 0 ? (
                                        filteredLogs.map((log) => (
                                            <TableRow
                                                key={log.id}
                                                className={`transition-colors ${log.action === "Generated" ? "cursor-pointer hover:bg-green-50/50" : "hover:bg-muted/30"}`}
                                                onClick={() => handleRowClick(log)}
                                                title={log.action === "Generated" ? "Click to open folder in explorer" : ""}
                                            >
                                                <TableCell className="text-xs font-semibold">
                                                    {DateUtils.format(log.timestamp)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${log.action === 'Mailed' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {log.action}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-sm font-semibold">{log.category || "-"}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="text-sm font-medium">{log.groupSummary}</div>
                                                        {log.recipient && (
                                                            <div className="text-xs text-muted-foreground italic">Sent to: {log.recipient}</div>
                                                        )}
                                                        {log.fileListJson && (
                                                            <div className="text-xs text-muted-foreground/90 whitespace-pre-wrap bg-muted/50 p-3 rounded-lg border border-muted-foreground/10 font-medium leading-relaxed">
                                                                <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-2 border-b pb-1">Processed Files:</div>
                                                                <div className="font-mono">
                                                                    {(() => {
                                                                        try {
                                                                            const parsed = JSON.parse(log.fileListJson);
                                                                            if (Array.isArray(parsed)) {
                                                                                return parsed.map(g => 
                                                                                    g.files.map(f => {
                                                                                        const flagStr = f.selectedAddons?.length > 0 ? ` [${f.selectedAddons.join(", ")}]` : "";
                                                                                        return `${f.originalName} -> ${g.name}${flagStr}`;
                                                                                    }).join("\n")
                                                                                ).join("\n");
                                                                            }
                                                                        } catch (e) {}
                                                                        return log.fileListJson;
                                                                    })()}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                                No process logs found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )
                )}
            </div>

            {/* Initial Setup Modal */}
            <Modal
                isOpen={showSetup}
                onClose={() => setShowSetup(false)}
                title="Group Management"
                className="max-w-2xl"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Select the photo items you want to process in this batch. Each item will create a separate group.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto p-1">
                        {allPhotoItems.map(item => (
                            <label key={item.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded text-primary"
                                    checked={selectedItemIds.includes(item.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedItemIds([...selectedItemIds, item.id]);
                                        else setSelectedItemIds(selectedItemIds.filter(id => id !== item.id));
                                    }}
                                />
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm">{item.name}</span>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="ghost" onClick={() => setShowSetup(false)}>Cancel</Button>
                        <Button onClick={handleSetupDone} className="bg-primary text-white">Done</Button>
                    </div>
                </div>
            </Modal>

            {/* Email Confirmation Modal */}
            <Modal
                isOpen={showEmailConfirmation}
                onClose={() => {
                    setShowEmailConfirmation(false);
                    setGenerating(false);
                }}
                title="Review Emails"
                className="max-w-4xl"
            >
                <div className="space-y-6">
                    <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold">Recipient Email</label>
                            <span className="text-xs text-muted-foreground">Total Emails: <span className="font-bold text-primary">{emailQueue.length}</span></span>
                        </div>
                        <div className="flex flex-wrap gap-2 p-2 bg-background border rounded-md focus-within:ring-1 focus-within:ring-primary min-h-[42px] transition-all">
                            {recipientEmails.map((email, idx) => (
                                <Badge 
                                    key={idx} 
                                    variant="secondary" 
                                    className="gap-1 pl-2 pr-1 py-1 h-7 cursor-pointer hover:bg-muted select-none"
                                    onDoubleClick={() => editEmailTag(idx)}
                                    title="Double click to edit"
                                >
                                    {email}
                                    <X 
                                        className="w-3 h-3 hover:text-destructive transition-colors" 
                                        onClick={(e) => { e.stopPropagation(); removeEmailTag(idx); }} 
                                    />
                                </Badge>
                            ))}
                            <input
                                ref={emailInputRef}
                                className="flex-1 bg-transparent outline-none text-sm min-w-[200px] h-7"
                                placeholder={recipientEmails.length === 0 ? "Type email and press space..." : ""}
                                value={emailInputValue}
                                onChange={(e) => setEmailInputValue(e.target.value)}
                                onKeyDown={handleEmailKeyDown}
                                onBlur={commitEmailTag}
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground italic px-1">Tip: Press space or enter to add email. Double-click a tag to edit.</p>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {emailQueue.map((mail, idx) => (
                            <div key={idx} className="border rounded-lg p-4 space-y-3 bg-card shadow-sm">
                                <div className="flex justify-between items-center border-b pb-2 mb-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Email #{idx + 1} - {mail.categoryName}</span>
                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{mail.files.length} Attachments</span>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Subject</label>
                                    <Input
                                        value={mail.subject}
                                        onChange={(e) => {
                                            const newQueue = [...emailQueue];
                                            newQueue[idx].subject = e.target.value;
                                            setEmailQueue(newQueue);
                                        }}
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Body</label>
                                    <textarea
                                        value={mail.body}
                                        onChange={(e) => {
                                            const newQueue = [...emailQueue];
                                            newQueue[idx].body = e.target.value;
                                            setEmailQueue(newQueue);
                                        }}
                                        className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                    />
                                </div>
                                <div className="pt-2">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-2">Attachments:</span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {mail.files.map((file, fidx) => {
                                            const isImage = file.type.startsWith("image/");
                                            const previewUrl = URL.createObjectURL(file);
                                            return (
                                                <div key={fidx} className="group relative flex flex-col gap-1 border rounded-lg p-1.5 bg-muted/20 hover:bg-muted/40 transition-all duration-200">
                                                    <div className="aspect-square rounded-md overflow-hidden bg-black/5 flex items-center justify-center border">
                                                        {isImage ? (
                                                            <img 
                                                                src={previewUrl} 
                                                                alt={file.name}
                                                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                                            />
                                                        ) : (
                                                            <FileText className="w-8 h-8 text-muted-foreground/50" />
                                                        )}
                                                    </div>
                                                    <div className="text-[9px] font-bold truncate text-center px-1" title={file.name}>
                                                        {file.name}
                                                    </div>
                                                    <button 
                                                        className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-primary hover:text-white"
                                                        onClick={() => setPreviewEmailImage(previewUrl)}
                                                        title="Open Preview"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={handleSkipEmail}>Skip & Close</Button>
                        <Button onClick={handleSendMails} className="bg-blue-600 text-white hover:bg-blue-700 gap-2">
                            Send All ({emailQueue.length} Mails)
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={!!previewEmailImage}
                onClose={() => setPreviewEmailImage(null)}
                title="Attachment Preview"
                className="max-w-4xl"
            >
                <div className="flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
                    {previewEmailImage && (
                        <img src={previewEmailImage} alt="Preview" className="max-w-full h-auto max-h-[80vh] shadow-2xl" />
                    )}
                </div>
            </Modal>

            {/* Generation Confirmation Modal */}
            <Modal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                title="Generation Confirmation"
            >
                <div className="space-y-4">
                    {alert.folderExists && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                            <strong>Warning:</strong> A folder already exists for this date. Generating will <strong>permanently delete</strong> the existing folder.
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                        Ready to process <strong>{groups.length} groups</strong> for today's batch?
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
                        <Button
                            className={`${alert.folderExists ? 'bg-destructive hover:bg-destructive/90' : 'bg-green-600 hover:bg-green-700'} text-white`}
                            onClick={doGenerate}
                        >
                            {alert.folderExists ? 'Overwrite & Process' : 'Start Process'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <SimpleAlert
                open={alert.open}
                onOpenChange={(open) => setAlert(prev => ({ ...prev, open }))}
                title={alert.title}
                description={alert.message}
                onConfirm={alert.onConfirm}
            />
        </div>
    );
}
