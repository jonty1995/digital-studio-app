import React, { useState, useEffect, useRef } from "react";
import { FilterHeader, useViewMode } from "@/components/shared/FilterHeader";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, Info, CheckCircle, Bug, Pause, Play, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { configurationService } from "@/services/configurationService";

export default function SystemLogs() {
    const [logs, setLogs] = useState([]);
    const [filterLevel, setFilterLevel] = useState("ALL");
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

        sse.addEventListener("history", (e) => {
            const history = JSON.parse(e.data);
            setLogs(history);
        });

        sse.addEventListener("log", (e) => {
            const log = JSON.parse(e.data);
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

    // Filter Logic
    const filteredLogs = logs.filter(log => {
        if (filterLevel === "ALL") return true;
        return log.level === filterLevel;
    });

    const getLevelColor = (level) => {
        switch (level) {
            case "ERROR": return "text-red-400";
            case "WARN": return "text-yellow-400";
            case "INFO": return "text-blue-400";
            case "DEBUG": return "text-gray-400";
            default: return "text-white";
        }
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500 relative">
            <FilterHeader
                title="System Logs"
                action={
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} title={isConnected ? "Connected" : "Disconnected"} />

                        <Button variant="outline" size="sm" onClick={() => setIsPaused(!isPaused)}>
                            {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                            {isPaused ? "Resume" : "Pause"}
                        </Button>

                        <Button variant="destructive" size="sm" onClick={handleClear}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                    </div>
                }
            >
                {/* Level Filters */}
                <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
                    {["ALL", "DEBUG", "INFO", "WARN", "ERROR"].map((level) => (
                        <button
                            key={level}
                            onClick={() => setFilterLevel(level)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${filterLevel === level
                                ? "bg-background shadow text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </FilterHeader>

            <div className="flex-1 bg-black p-4 overflow-auto font-mono text-xs md:text-sm text-gray-300">
                {filteredLogs.map((log, index) => (
                    <div key={index} className="mb-1 hover:bg-white/5 p-0.5 rounded flex gap-2 break-all">
                        <span className="text-gray-500 shrink-0 select-none">[{log.timestamp}]</span>
                        <span className={`font-bold w-12 shrink-0 ${getLevelColor(log.level)}`}>{log.level}</span>
                        <span className="text-gray-500 w-24 shrink-0 truncate hidden md:block" title={log.thread}>[{log.thread}]</span>
                        <span className="text-white whitespace-pre-wrap">{log.message}</span>
                    </div>
                ))}
                <div ref={logsEndRef} />

                {filteredLogs.length === 0 && (
                    <div className="text-center text-gray-600 mt-20 italic">No logs found for this filter...</div>
                )}
            </div>
        </div>
    );
}
