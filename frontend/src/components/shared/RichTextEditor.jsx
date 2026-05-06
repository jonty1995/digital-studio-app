import React, { useRef, useEffect, useState } from "react";
import { 
    Bold, Italic, Underline, 
    List, Indent, Outdent, 
    Palette
} from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";

export function RichTextEditor({ value, onChange, placeholder }) {
    const editorRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
            editorRef.current.innerHTML = value || "";
        }
    }, [value]);

    const execCommand = (command, val = null) => {
        editorRef.current?.focus();
        // Restore selection if lost
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            document.execCommand(command, false, val);
        } else {
            // If no selection, just focus and try (unlikely with contentEditable)
            document.execCommand(command, false, val);
        }
        handleInput();
        if (command === "foreColor") {
            setIsColorPickerOpen(false);
        }
    };

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const colors = [
        { name: "Black", value: "#000000" },
        { name: "Gray", value: "#6b7280" },
        { name: "Red", value: "#ef4444" },
        { name: "Orange", value: "#f97316" },
        { name: "Yellow", value: "#facc15" },
        { name: "Green", value: "#22c55e" },
        { name: "Blue", value: "#3b82f6" },
        { name: "Indigo", value: "#6366f1" },
        { name: "Purple", value: "#a855f7" },
        { name: "Pink", value: "#ec4899" },
    ];

    const isEmpty = !value || value === "" || value === "<br>" || value === "<div><br></div>" || value === "<p><br></p>";

    return (
        <div className="relative border rounded-xl overflow-hidden bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
            {/* Toolbar - Forced single row */}
            <div className="flex items-center gap-0 p-1 bg-muted/30 border-b overflow-x-auto no-scrollbar whitespace-nowrap">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-background flex-shrink-0" 
                    onClick={() => execCommand("bold")}
                    type="button"
                    title="Bold"
                >
                    <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-background flex-shrink-0" 
                    onClick={() => execCommand("italic")}
                    type="button"
                    title="Italic"
                >
                    <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-background flex-shrink-0" 
                    onClick={() => execCommand("underline")}
                    type="button"
                    title="Underline"
                >
                    <Underline className="h-3.5 w-3.5" />
                </Button>
                
                <div className="w-[1px] h-4 bg-border mx-1 flex-shrink-0" />
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-background flex-shrink-0" 
                    onClick={() => execCommand("insertUnorderedList")}
                    type="button"
                    title="Bullets"
                >
                    <List className="h-3.5 w-3.5" />
                </Button>
                
                <div className="w-[1px] h-4 bg-border mx-1 flex-shrink-0" />
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-background flex-shrink-0" 
                    onClick={() => execCommand("outdent")}
                    type="button"
                    title="Outdent"
                >
                    <Outdent className="h-3.5 w-3.5" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-background flex-shrink-0" 
                    onClick={() => execCommand("indent")}
                    type="button"
                    title="Indent"
                >
                    <Indent className="h-3.5 w-3.5" />
                </Button>
                
                <div className="w-[1px] h-4 bg-border mx-1 flex-shrink-0" />
                
                <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                    <PopoverTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-background flex-shrink-0" 
                            type="button"
                            title="Font Color"
                        >
                            <Palette className="h-3.5 w-3.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-3" align="start">
                        <div className="grid grid-cols-5 gap-2">
                            {colors.map(c => (
                                <button
                                    key={c.value}
                                    className="w-6 h-6 rounded-full border border-border shadow-sm hover:scale-125 transition-all"
                                    style={{ backgroundColor: c.value }}
                                    onClick={() => execCommand("foreColor", c.value)}
                                    title={c.name}
                                    type="button"
                                />
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            
            {/* Editor Area */}
            <div className="relative min-h-[140px]">
                <div
                    ref={editorRef}
                    contentEditable
                    className={cn(
                        "p-4 min-h-[140px] max-h-[400px] overflow-y-auto outline-none text-sm prose prose-sm max-w-none leading-relaxed",
                        "selection:bg-primary/20 list-disc [&>ul]:list-disc [&>ul]:ml-4"
                    )}
                    onInput={handleInput}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={{ 
                        whiteSpace: "pre-wrap", 
                        wordBreak: "break-word" 
                    }}
                />
                {isEmpty && !isFocused && (
                    <div className="absolute top-4 left-4 text-muted-foreground pointer-events-none text-sm opacity-50 italic">
                        {placeholder}
                    </div>
                )}
            </div>
        </div>
    );
}
