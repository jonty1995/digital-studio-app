import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, Calendar, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { format } from "date-fns";

export default function LabProcessLog() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState("");
    const [alert, setAlert] = useState({ open: false, title: "", message: "", onConfirm: null });

    const fetchLogs = async () => {
        try {
            const res = await fetch("/api/lab-process/logs");
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

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
        setAlert({
            open: true,
            title: "Delete Log",
            message: "Are you sure you want to delete this log entry? This action cannot be undone.",
            onConfirm: () => deleteLog(id)
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

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <PageHeader title="Lab Process Logs">
                <div className="flex items-center gap-4">
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
                </div>
            </PageHeader>

            <div className="p-6 flex-1 overflow-auto">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">Loading history...</p>
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto bg-card rounded-xl border shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[150px]">Timestamp</TableHead>
                                    <TableHead className="w-[120px]">Process Date</TableHead>
                                    <TableHead className="w-[100px]">Action</TableHead>
                                    <TableHead className="w-[150px]">Category</TableHead>
                                    <TableHead>Summary / Recipient</TableHead>
                                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-xs font-medium">
                                                {format(new LocalDateTime(log.timestamp), "dd MMM yyyy HH:mm")}
                                            </TableCell>
                                            <TableCell className="text-sm">{log.processDate}</TableCell>
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
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => confirmDelete(log.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            No process logs found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

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

// Helper to handle both JS Date and Java LocalDateTime strings
function LocalDateTime(dateTimeStr) {
    if (!dateTimeStr) return new Date();
    // Java LocalDateTime comes as "2023-10-27T10:30:00" or with nanoseconds
    return new Date(dateTimeStr);
}
