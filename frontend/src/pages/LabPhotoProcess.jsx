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
import { DateUtils } from "@/utils/DateUtils";
import * as labService from "@/services/labProcessService";
import { configurationService } from "@/services/configurationService";

export default function LabPhotoProcess() {
    const [activeTab, setActiveTab] = useState("Action"); // Action or Logs
    const [groups, setGroups] = useState([]);
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
            const data = await configurationService.getValues();
            if (data) {
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
            const data = await labService.fetchLabProcessLogs();
            if (data) {
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
            const fileLines = [];
            groups.forEach(group => {
                group.files.forEach((f, idx) => {
                    const flags = [];
                    if (f.frame) flags.push("Frame");
                    if (f.lamination) flags.push("Lam");
                    const flagStr = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
                    fileLines.push(`${f.file.name} -> ${group.name} (${idx + 1})${flagStr}`);
                });
            });
            finalFileList = fileLines.join("\n");
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
                files || finalFileList.split("\n")
            );
            if (data) {
                fetchLogs(); // Refresh logs
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

    const doGenerate = async () => {
        const overwrite = alert.folderExists;
        setShowConfirmModal(false);
        setGenerating(true);
        try {
            for (const group of groups) {
                await labService.generateGroup(group.name, group.files, today);
            }

            await saveLog("Generated");

            setShowEmailModal(true);
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

    const doEmail = async () => {
        if (!recipientEmail || !recipientEmail.includes("@")) {
            return showAlert("Invalid Email", "Please enter a valid recipient email address.");
        }

        setShowEmailModal(false);
        setGenerating(false);

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

            const CATEGORIES = [
                { id: 'standard', name: 'Standard', filter: f => !f.frame && !f.lamination },
                { id: 'frame', name: 'Frame', filter: f => f.frame && !f.lamination },
                { id: 'lamination', name: 'Lamination', filter: f => !f.frame && f.lamination },
                { id: 'both', name: 'Frame + Lamination', filter: f => f.frame && f.lamination },
            ];

            const overallContent = groups.map(g => `${g.name} - ${g.files.length}`).join(", ");
            const allEmailBatches = [];

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

                const catBatches = []; // Each element is an array of items (a batch)

                catFiles.forEach(item => {
                    // Find the first batch that can accommodate this file
                    let foundBatch = false;
                    for (let batch of catBatches) {
                        const currentBatchSize = batch.reduce((sum, b) => sum + b.file.size, 0);
                        if (currentBatchSize + item.file.size <= RAW_FILE_LIMIT_BYTES) {
                            batch.push(item);
                            foundBatch = true;
                            break;
                        }
                    }

                    // If no batch has space, create a new one
                    if (!foundBatch) {
                        catBatches.push([item]);
                    }
                });

                const catOverallContent = groups
                    .map(g => {
                        const fileCount = g.files.filter(f => cat.filter(f)).length;
                        return fileCount > 0 ? `${g.name} - ${fileCount}` : null;
                    })
                    .filter(Boolean)
                    .join(", ");

                catBatches.forEach(batch => {
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

                    allEmailBatches.push({
                        category: cat,
                        batch,
                        catOverallContent,
                        categoryName: cat.name,
                        batchSummary: batchSummaryStr,
                        batchBodySummary,
                        files: batch.map(cf => cf.file)
                    });
                });
            }

            const totalGlobalParts = allEmailBatches.length;
            const overallTasks = allEmailBatches.map((batchData, index) => {
                const { category, batch, categoryName, batchSummary, batchBodySummary, files } = batchData;
                const fileList = batch.map((item, idx) => `  ${idx + 1}. ${item.file.name}`).join("\n");

                const subjectTag = category.id === 'standard' ? '' : ` [${category.name}]`;
                const partIndicator = `(Part ${index + 1}/${totalGlobalParts})`;
                const subject = `${partIndicator} [${batchSummary}]${subjectTag}`;
                const body = `${partIndicator}\n` +
                    `-----------------------\n` +
                    `${batchBodySummary}\n` +
                    `-----------------------\n` +
                    `Files:\n` +
                    `${fileList}`;

                return {
                    recipient: recipientEmail,
                    subject,
                    body,
                    categoryName,
                    batchSummary: `${partIndicator} ${batchSummary}`,
                    files
                };
            });

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

        const logDate = log.timestamp ? log.timestamp.split('T')[0] : "";
        const matchesDate = !dateFilter || logDate === dateFilter;
        return matchesSearch && matchesDate;
    });

    const handleRowClick = async (log) => {
        if (log.action === "Generated") {
            try {
                const logDate = log.timestamp.split('T')[0];
                await labService.openFolder(logDate);
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
                                                                <div className="font-mono">{log.fileListJson}</div>
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
