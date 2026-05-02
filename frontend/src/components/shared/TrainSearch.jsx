import React, { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { trainListService } from "@/services/trainListService";
import { Loader2, Search, Train } from "lucide-react";
import { cn } from "@/lib/utils";
import Fuse from "fuse.js";

// Shared cache for trains
let trainsCache = null;
let trainsPromise = null;

export const clearTrainCache = () => {
    trainsCache = null;
    trainsPromise = null;
};

export function TrainSearch({ value, onSelect, placeholder, className, trainNumberValue, trainNameValue }) {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [trains, setTrains] = useState(trainsCache || []);
    const containerRef = useRef(null);

    // Initialize Fuse
    const fuse = useMemo(() => {
        if (!trains || trains.length === 0) return null;
        return new Fuse(trains, {
            keys: [
                { name: "trainNumber", weight: 0.6 },
                { name: "trainName", weight: 0.4 }
            ],
            threshold: 0.3,
            minMatchCharLength: 2,
            includeScore: true
        });
    }, [trains]);

    // Sync initial query if needed
    useEffect(() => {
        if (trainNumberValue || trainNameValue) {
            setQuery(trainNumberValue ? `${trainNumberValue} - ${trainNameValue}` : trainNameValue);
        } else {
            setQuery("");
        }
    }, [trainNumberValue, trainNameValue]);

    useEffect(() => {
        const loadTrains = async () => {
            if (trainsCache) {
                setTrains(trainsCache);
                return;
            }
            if (!trainsPromise) {
                trainsPromise = trainListService.getAll().then(res => {
                    trainsCache = res;
                    return res;
                });
            }
            setIsLoading(true);
            try {
                const data = await trainsPromise;
                setTrains(data);
            } catch (error) {
                console.error("Failed to load trains:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadTrains();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        if (fuse) {
            const results = fuse.search(query).slice(0, 10).map(r => r.item);
            setSuggestions(results);
        }
    }, [query, fuse, isOpen]);

    const handleSelect = (train) => {
        setQuery(`${train.trainNumber} - ${train.trainName}`);
        onSelect(train);
        setIsOpen(false);
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <div className="relative">
                <Input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value === "") onSelect({ trainNumber: "", trainName: "" });
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        if (query.length >= 2 && fuse) {
                            const results = fuse.search(query).slice(0, 10).map(r => r.item);
                            setSuggestions(results);
                        }
                    }}
                    placeholder={placeholder}
                    className="pr-9"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Search className="w-4 h-4" />
                    )}
                </div>
            </div>

            {isOpen && (suggestions.length > 0) && (
                <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md max-h-[300px] overflow-auto animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                        {suggestions.map((train) => (
                            <button
                                key={train.id}
                                onClick={() => handleSelect(train)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors group"
                            >
                                <Train className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-xs">{train.trainNumber}</span>
                                    <span className="text-[11px] font-medium truncate max-w-[200px]">{train.trainName}</span>
                                    <span className="text-[9px] text-muted-foreground italic">
                                        {train.source} → {train.destination}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
