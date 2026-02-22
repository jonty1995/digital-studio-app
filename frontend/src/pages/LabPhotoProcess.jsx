import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Play, Loader2, Calendar, FileText, Search, Trash2 } from "lucide-react";
import { LabPhotoGroup } from "@/components/lab/LabPhotoGroup";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useEmail } from "@/contexts/EmailContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function LabPhotoProcess() {
    const [activeTab, setActiveTab] = useState("Action"); // Action or Logs
    const [groups, setGroups] = useState([]);
    const [processDate, setProcessDate] = useState(new Date().toISOString().split('T')[0]);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState({ open: false, title: "", message: "", onConfirm: null, folderExists: false });
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState("");

    // Logs related state
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState("");

    const showAlert = (title, message, onConfirm = null) => {
        setAlert({ open: true, title, message, onConfirm, folderExists: alert.folderExists });
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch("/api/config/values");
            if (res.ok) {
                const data = await res.json();
                const groupNamesConfig = data.find(item => item.name === "GROUP_NAMES");
                if (groupNamesConfig && groupNamesConfig.value) {
                    const names = groupNamesConfig.value.split(",").map(n => n.trim()).filter(n => n !== "");
                    if (names.length > 0) {
                        setGroups(names.map((name, idx) => ({
                            id: Date.now() + idx,
                            name,
                            files: []
                        })));
                    } else {
                        setGroups([{ id: Date.now(), name: "4x6", files: [] }]);
                    }
                } else {
                    setGroups([{ id: Date.now(), name: "4x6", files: [] }]);
                }

                const recipientConfig = data.find(item => item.name === "EMAIL_RECIPIENT");
                if (recipientConfig && recipientConfig.value) {
                    setRecipientEmail(recipientConfig.value);
                }
            }
        } catch (error) {
            console.error("Failed to load group names configuration", error);
            setGroups([{ id: Date.now(), name: "4x6", files: [] }]);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await fetch("/api/lab-process/logs");
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        fetchConfig();
        fetchLogs();
    }, []);

    const addGroup = () => {
        setGroups([...groups, { id: Date.now(), name: "", files: [] }]);
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
            const res = await fetch(`/api/lab-process/check-exists?processDate=${processDate}`);
            if (res.ok) {
                const { exists } = await res.json();
                setAlert(prev => ({ ...prev, folderExists: exists }));
                setShowConfirmModal(true);
            }
        } catch (error) {
            console.error("Failed to check folder existence", error);
            setShowConfirmModal(true);
        }
    };

    const saveLog = async (action, category = null, recipient = null, batchSummary = null, files = null) => {
        try {
            const res = await fetch("/api/lab-process/logs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    processDate,
                    action,
                    category,
                    recipient,
                    groupSummary: batchSummary || groups.map(g => `${g.name}: ${g.files.length}`).join(", "),
                    fileListJson: files ? files.map(f => f.name).join(", ") : groups.flatMap(g => g.files.map(f => f.file.name)).join(", ")
                })
            });
            if (res.ok) {
                fetchLogs(); // Refresh logs
            }
        } catch (e) {
            console.error("Failed to save log", e);
        }
    };

    const deleteLog = async (id) => {
        try {
            const res = await fetch(`/api/lab-process/logs/${id}`, { method: "DELETE" });
            if (res.ok) {
                setLogs(logs.filter(log => log.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete log", error);
        }
    };

    const confirmDelete = (id) => {
        showAlert("Delete Log", "Are you sure you want to delete this log entry? This action cannot be undone.", () => deleteLog(id));
    };

    const doGenerate = async () => {
        const overwrite = alert.folderExists;
        setShowConfirmModal(false);
        setGenerating(true);
        try {
            if (overwrite) {
                const clearRes = await fetch(`/api/lab-process/folder?processDate=${processDate}`, {
                    method: "DELETE"
                });
                if (!clearRes.ok) {
                    const error = await clearRes.json();
                    throw new Error(error.error || "Failed to clear existing folder");
                }
            }

            for (const group of groups) {
                const formData = new FormData();
                formData.append("groupName", group.name);
                group.files.forEach(fileObj => {
                    formData.append("files", fileObj.file);
                });

                const res = await fetch(`/api/lab-process/generate?processDate=${processDate}`, {
                    method: "POST",
                    body: formData
                });

                if (!res.ok) {
                    const error = await res.json();
                    if (error.error === "LAB_PROCESS_PATH_NOT_CONFIGURED") {
                        throw new Error("Target location not configured. Please set LAB_PROCESS_PATH in Configuration -> Values.");
                    }
                    throw new Error(error.error || "Failed to process " + group.name);
                }
            }

            await saveLog("Generated");

            const today = new Date().toISOString().split('T')[0];
            if (processDate === today) {
                setShowEmailModal(true);
            } else {
                handleSkipEmail();
            }
        } catch (error) {
            setGenerating(false);
            showAlert("Error", error.message);
        }
    };

    const { sendEmailQueue } = useEmail();

    const doEmail = async () => {
        if (!recipientEmail || !recipientEmail.includes("@")) {
            return showAlert("Invalid Email", "Please enter a valid recipient email address.");
        }

        setShowEmailModal(false);
        setGenerating(false);

        try {
            let maxUploadSizeMb = 25;
            try {
                const configRes = await fetch("/api/config/values");
                if (configRes.ok) {
                    const configData = await configRes.json();
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

            const CATEGORIES = [
                { id: 'standard', name: 'Standard', filter: f => !f.frame && !f.lamination },
                { id: 'frame', name: 'Frame', filter: f => f.frame && !f.lamination },
                { id: 'lamination', name: 'Lamination', filter: f => !f.frame && f.lamination },
                { id: 'both', name: 'Both (Frame + Lamination)', filter: f => f.frame && f.lamination },
            ];

            const overallContent = groups.map(g => `${g.name} - ${g.files.length}`).join(", ");
            const overallTasks = [];

            for (const cat of CATEGORIES) {
                const catFiles = [];
                groups.forEach(group => {
                    group.files.forEach((fileObj, index) => {
                        if (cat.filter(fileObj)) {
                            const extension = fileObj.file.name.substring(fileObj.file.name.lastIndexOf("."));
                            const renamedFile = new File([fileObj.file], `${group.name}(${index + 1})${extension}`, { type: fileObj.file.type });
                            catFiles.push({ file: renamedFile, groupName: group.name });
                        }
                    });
                });

                if (catFiles.length === 0) continue;

                const catBatches = [];
                let currentBatch = [];
                let currentSize = 0;

                for (const item of catFiles) {
                    if (currentSize + item.file.size > RAW_FILE_LIMIT_BYTES && currentBatch.length > 0) {
                        catBatches.push(currentBatch);
                        currentBatch = [];
                        currentSize = 0;
                    }
                    currentBatch.push(item);
                    currentSize += item.file.size;
                }
                if (currentBatch.length > 0) {
                    catBatches.push(currentBatch);
                }

                const catOverallContent = groups
                    .map(g => {
                        const fileCount = g.files.filter(f => cat.filter(f)).length;
                        return fileCount > 0 ? `${g.name} - ${fileCount}` : null;
                    })
                    .filter(Boolean)
                    .join(", ");

                catBatches.forEach((batch, i) => {
                    const groupCounts = batch.reduce((acc, item) => {
                        acc[item.groupName] = (acc[item.groupName] || 0) + 1;
                        return acc;
                    }, {});

                    const groupSummary = Object.entries(groupCounts)
                        .map(([name, count]) => `${name}: ${count} ${count > 1 ? "files" : "file"}`)
                        .join("\n");

                    const fileList = batch.map((item, idx) => `  ${idx + 1}. ${item.file.name}`).join("\n");

                    const formData = new FormData();
                    formData.append("recipient", recipientEmail);
                    const subjectTag = cat.id === 'standard' ? '' : ` [${cat.name}]`;
                    formData.append("subject", `${overallContent}${subjectTag}${catBatches.length > 1 ? ` (Part ${i + 1}/${catBatches.length})` : ""}`);
                    formData.append("body", `Processing Type: ${cat.name}\nBatch ${i + 1} of ${catBatches.length} contains:\n\nGroup Summary:\n${groupSummary}\n\nFiles in this batch:\n${fileList}\n\nOverall this category: ${catOverallContent}`);

                    batch.forEach(({ file }) => {
                        formData.append("files", file);
                    });

                    overallTasks.push({ formData });
                });

                await saveLog("Mailed", cat.name, recipientEmail, catOverallContent, catFiles.map(cf => cf.file));
            }

            sendEmailQueue(overallTasks);

            showAlert("Email Sending Started", "The emails are being sent in the background. You can continue working on other pages.", () => {
                setGroups(prev => prev.map(g => ({ ...g, files: [] })));
            });
        } catch (error) {
            showAlert("Error Preparing Email", error.message);
        }
    };

    const handleSkipEmail = () => {
        setShowEmailModal(false);
        setGenerating(false);
        showAlert("Success", "All groups have been processed and saved to the configured location.", () => {
            setGroups(prev => prev.map(g => ({ ...g, files: [] })));
        });
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            (log.category && log.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.recipient && log.recipient.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.groupSummary && log.groupSummary.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (log.fileListJson && log.fileListJson.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesDate = !dateFilter || log.processDate === dateFilter;
        return matchesSearch && matchesDate;
    });

    const handleRowClick = async (log) => {
        if (log.action === "Generated") {
            try {
                const res = await fetch(`/api/lab-process/open-folder?processDate=${log.processDate}`);
                if (!res.ok) {
                    const err = await res.json();
                    if (err.error === "FOLDER_NOT_FOUND") {
                        showAlert("Folder Not Found", "The folder for this batch no longer exists on the disk.");
                    } else {
                        showAlert("Error", "Failed to open folder: " + err.error);
                    }
                }
            } catch (error) {
                console.error("Failed to open folder", error);
                showAlert("Error", "Failed to communicate with local system.");
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
                            <div className="flex items-center gap-2 border-l border-r px-4 mx-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="date"
                                    className="w-[160px] h-9"
                                    value={processDate}
                                    onChange={(e) => setProcessDate(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" onClick={addGroup} className="gap-2">
                                <Plus className="w-4 h-4" /> Add Group
                            </Button>
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
                            <p className="text-muted-foreground animate-pulse">Loading default groups...</p>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            {groups.map((group, index) => (
                                <LabPhotoGroup
                                    key={group.id}
                                    group={group}
                                    index={index}
                                    onUpdate={updateGroup}
                                    onRemove={removeGroup}
                                />
                            ))}
                            {groups.length === 0 && (
                                <div className="text-center py-20 border-2 border-dashed rounded-xl">
                                    <p className="text-muted-foreground">No groups added. Click "Add Group" to start.</p>
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
                                                    {format(new Date(log.timestamp), "dd MMM yyyy HH:mm")}
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
                                                            <div className="text-[10px] text-muted-foreground/80 line-clamp-1 hover:line-clamp-none transition-all cursor-help bg-muted/50 p-1 rounded">
                                                                Files: {log.fileListJson}
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

            {/* Modals remain same but use alert.open */}
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
                        Ready to process <strong>{groups.length} groups</strong> for {processDate}?
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

            <Modal
                isOpen={showEmailModal}
                onClose={() => { }}
                title="Success! Send via Email?"
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Generation completed successfully. Would you like to send a copy to the lab via email?
                    </p>
                    <div className="space-y-2 pt-2">
                        <label className="text-sm font-medium">Recipient Email</label>
                        <Input
                            type="email"
                            placeholder="recipient@example.com"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground italic">
                            Multiple emails will be sent if files exceed 25MB.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="outline" onClick={handleSkipEmail}>Skip & Close</Button>
                        <Button
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            onClick={doEmail}
                            disabled={!recipientEmail || !recipientEmail.includes("@")}
                        >
                            Send Email
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
