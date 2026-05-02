import React, { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { stationService } from "@/services/stationService";
import { Loader2, Search, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import Fuse from "fuse.js";

// Shared cache for stations to avoid re-fetching
let stationsCache = null;
let stationsPromise = null;

export const clearStationCache = () => {
    stationsCache = null;
    stationsPromise = null;
};

export function StationSearch({ value, onChange, placeholder, className }) {
    const [query, setQuery] = useState(value || "");
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [stations, setStations] = useState(stationsCache || []);
    const containerRef = useRef(null);

    // Initialize Fuse with stations
    const fuse = useMemo(() => {
        if (!stations || stations.length === 0) return null;
        return new Fuse(stations, {
            keys: [
                { name: "stationName", weight: 0.7 },
                { name: "stationCode", weight: 0.3 }
            ],
            threshold: 0.3,
            minMatchCharLength: 2,
            includeScore: true
        });
    }, [stations]);

    useEffect(() => {
        setQuery(value || "");
    }, [value]);

    useEffect(() => {
        const loadStations = async () => {
            if (stationsCache) {
                setStations(stationsCache);
                return;
            }
            if (!stationsPromise) {
                stationsPromise = stationService.getAll().then(res => {
                    stationsCache = res;
                    return res;
                });
            }
            setIsLoading(true);
            try {
                const data = await stationsPromise;
                setStations(data);
            } catch (error) {
                console.error("Failed to load stations:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadStations();
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

    // Fuzzy search using Fuse.js
    useEffect(() => {
        if (!isOpen && query === value) return;
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        if (fuse) {
            const results = fuse.search(query).slice(0, 10).map(r => r.item);
            setSuggestions(results);
            setIsOpen(true);
        }
    }, [query, fuse]);

    const handleSelect = (station) => {
        const displayValue = `${station.stationName} (${station.stationCode})`;
        setQuery(displayValue);
        onChange(displayValue);
        setIsOpen(false);
    };

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            <div className="relative">
                <Input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value === "") onChange("");
                    }}
                    onFocus={() => query.length >= 2 && setIsOpen(true)}
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
                        {suggestions.map((station) => (
                            <button
                                key={station.id}
                                onClick={() => handleSelect(station)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors group"
                            >
                                <MapPin className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                <div className="flex flex-col">
                                    <span className="font-medium">{station.stationName}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                                        {station.stationCode} • {station.regionCode} Region
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
