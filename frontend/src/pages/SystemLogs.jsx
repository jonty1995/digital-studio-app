import React, { useState, useEffect, useRef, useMemo } from "react";
import { FilterHeader } from "@/components/shared/FilterHeader";
import { Button } from "@/components/ui/button";
import { Trash2, Pause, Play, Download, Search, Clock, BarChart3, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { configurationService } from "@/services/configurationService";
import { subMinutes, isAfter } from "date-fns";
import { DateUtils } from "@/utils/DateUtils";

export default function SystemLogs() {
    const [logs, setLogs] = useState([]);
    const [filterLevel, setFilterLevel] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [timeFilter, setTimeFilter] = useState("all"); // all, 5m, 15m, 1h
    const [isConnected, setIsConnected] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const logsEndRef = useRef(null);
    const eventSourceRef = useRef(null);

    const [maxLogs, setMaxLogs] = useState(50000);

    // Auto-scroll
    const scrollToBottom = () => {
        if (!isPaused) {
            logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs, isPaused]);

    useEffect(() => {
        // Fetch buffer size config
        configurationService.getValues().then(values => {
            const config = values.find(v => v.name === "LOG_BUFFER_SIZE");
            if (config && config.value) {
                const limit = parseInt(config.value, 10);
                if (!isNaN(limit) && limit > 0) {
                    setMaxLogs(limit);
                }
            }
        });

        connectToLogs();
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const connectToLogs = () => {
        if (eventSourceRef.current) eventSourceRef.current.close();

        const sse = new EventSource("/api/logs/stream");
        eventSourceRef.current = sse;

        sse.onopen = () => setIsConnected(true);

        const normalizeLog = (log) => {
            if (log.timestamp) {
                log.timestamp = DateUtils.toDate(log.timestamp);
            }
            return log;
        };

        sse.addEventListener("history", (e) => {
            const history = JSON.parse(e.data).map(normalizeLog);
            setLogs(history);
        });

        sse.addEventListener("log", (e) => {
            const log = normalizeLog(JSON.parse(e.data));
            setLogs((prev) => [...prev, log].slice(-maxLogs)); // Dynamic limit
        });

        sse.onerror = () => {
            setIsConnected(false);
            sse.close();
            // Retry in 5s
            setTimeout(connectToLogs, 5000);
        };
    };

    const handleClear = async () => {
        try {
            await fetch("/api/logs/clear", { method: "POST" });
            setLogs([]);
        } catch (error) {
            console.error("Failed to clear logs", error);
        }
    };

    const handleDownload = () => {
        const content = filteredLogs
            .map(log => `[${log.timestamp}] [${log.level}] [${log.thread}] ${log.message}`)
            .join("\n");
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `logs_${DateUtils.formatForInput(new Date())}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Filter Logic
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            // Level Filter
            if (filterLevel !== "ALL" && log.level !== filterLevel) return false;

            // Search Term
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase();
                const matches = (log.message && log.message.toLowerCase().includes(searchLower)) ||
                    (log.thread && log.thread.toLowerCase().includes(searchLower)) ||
                    (log.level && log.level.toLowerCase().includes(searchLower));
                if (!matches) return false;
            }

            // Time Filter
            if (timeFilter !== "all") {
                const logTime = DateUtils.toDate(log.timestamp);
                if (!logTime) return true;
                let threshold;
                if (timeFilter === "5m") threshold = subMinutes(new Date(), 5);
                if (timeFilter === "15m") threshold = subMinutes(new Date(), 15);
                if (timeFilter === "1h") threshold = subMinutes(new Date(), 60);

                if (threshold && !isAfter(logTime, threshold)) return false;
            }

            return true;
        });
    }, [logs, filterLevel, searchTerm, timeFilter]);

    // Stats Logic
    const stats = useMemo(() => {
        const counts = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
        logs.forEach(log => {
            if (counts[log.level] !== undefined) counts[log.level]++;
        });
        return counts;
    }, [logs]);

    const getLevelColor = (level) => {
        switch (level) {
            case "ERROR": return "bg-red-500/20 text-red-400 border-red-500/30";
            case "WARN": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
            case "INFO": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
            case "DEBUG": return "bg-gray-500/20 text-gray-400 border-gray-500/30";
            default: return "bg-white/10 text-white";
        }
    };

    const getLogTextColor = (level) => {
        switch (level) {
            case "ERROR": return "text-red-400";
            case "WARN": return "text-yellow-400";
            case "INFO": return "text-blue-400";
            case "DEBUG": return "text-gray-400";
            default: return "text-white";
        }
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500 relative overflow-hidden">
            <FilterHeader
                title="System Logs"
                action={
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} title={isConnected ? "Connected" : "Disconnected"} />

                        <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)} className="h-9">
                            {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                            {isPaused ? "Resume" : "Pause"}
                        </Button>

                        <Button variant="outline" size="sm" onClick={handleDownload} className="h-9">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                        </Button>

                        <Button variant="destructive" size="sm" onClick={handleClear} className="h-9">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                    </div>
                }
            >
                {/* Level Filters */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg border">
                        {["ALL", "DEBUG", "INFO", "WARN", "ERROR"].map((level) => (
                            <button
                                key={level}
                                onClick={() => setFilterLevel(level)}
                                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${filterLevel === level
                                    ? "bg-background shadow text-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                    }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                            placeholder="Search patterns..."
                            className="pl-9 w-[280px] h-9 bg-muted/50 focus:bg-background transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2.5 top-2.5 hover:text-foreground text-muted-foreground transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-lg border border-white/5">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <select
                            className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
                            value={timeFilter}
                            onChange={(e) => setTimeFilter(e.target.value)}
                        >
                            <option value="all">All Time</option>
                            <option value="5m">Last 5 Mins</option>
                            <option value="15m">Last 15 Mins</option>
                            <option value="1h">Last 1 Hour</option>
                        </select>
                    </div>
                </div>
            </FilterHeader>

            {/* Stats Bar */}
            <div className="px-6 py-2 bg-muted/10 border-b flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border bg-red-500/10 text-red-500 border-red-500/20">
                        <span className="font-bold">{stats.ERROR}</span> Errors
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        <span className="font-bold">{stats.WARN}</span> Warnings
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border bg-blue-500/10 text-blue-500 border-blue-500/20">
                        <span className="font-bold">{stats.INFO}</span> Info
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border bg-gray-500/10 text-gray-500 border-gray-500/20">
                        <span className="font-bold">{stats.DEBUG}</span> Debug
                    </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Showing {filteredLogs.length} of {logs.length} entries</span>
                </div>
            </div>

            <div className="flex-1 bg-[#09090b] p-4 overflow-auto font-mono text-xs md:text-[13px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                {filteredLogs.map((log, index) => (
                    <div key={index} className="mb-0.5 hover:bg-white/5 p-1 rounded-sm group flex items-start gap-3 transition-colors">
                        <span className="text-gray-600 shrink-0 select-none opacity-60 group-hover:opacity-100 transition-opacity">
                            {DateUtils.formatTime(log.timestamp)}
                        </span>
                        <div className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase border shrink-0 min-w-[55px] text-center ${getLevelColor(log.level)}`}>
                            {log.level}
                        </div>
                        <span className="text-gray-700 w-32 shrink-0 truncate hidden lg:block opacity-50 select-none" title={log.thread}>
                            {log.thread}
                        </span>
                        <span className={`whitespace-pre-wrap break-all ${getLogTextColor(log.level)}`}>
                            {log.message}
                        </span>
                    </div>
                ))}
                <div ref={logsEndRef} />

                {filteredLogs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground italic gap-4">
                        <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center scale-150 mb-2">
                            <Search className="w-6 h-6 opacity-20" />
                        </div>
                        <p>No logs matching current search & filters...</p>
                        <Button variant="link" size="sm" onClick={() => { setSearchTerm(""); setFilterLevel("ALL"); setTimeFilter("all"); }}>
                            Clear all filters
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
