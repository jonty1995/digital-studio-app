import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X, Image as ImageIcon, Plus, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";

export function LabPhotoGroup({ group, onUpdate, onRemove, index }) {
    const [dragActive, setDragActive] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const inputRef = useRef(null);

    // Diverse alternating background and border colors
    const COLOR_SCHEMES = [
        { bg: "bg-blue-50/40", border: "border-blue-200/60", active: "border-blue-500 bg-blue-50/60" },
        { bg: "bg-purple-50/40", border: "border-purple-200/60", active: "border-purple-500 bg-purple-50/60" },
        { bg: "bg-emerald-50/40", border: "border-emerald-200/60", active: "border-emerald-500 bg-emerald-50/60" },
        { bg: "bg-amber-50/40", border: "border-amber-200/60", active: "border-amber-500 bg-amber-50/60" },
        { bg: "bg-rose-50/40", border: "border-rose-200/60", active: "border-rose-500 bg-rose-50/60" },
        { bg: "bg-indigo-50/40", border: "border-indigo-200/60", active: "border-indigo-500 bg-indigo-50/60" },
        { bg: "bg-cyan-50/40", border: "border-cyan-200/60", active: "border-cyan-500 bg-cyan-50/60" }
    ];

    const scheme = COLOR_SCHEMES[index % COLOR_SCHEMES.length];

    const handleFiles = (newFiles) => {
        const imageFiles = Array.from(newFiles).filter(file => file.type.startsWith("image/"));
        if (imageFiles.length === 0) return;

        const newFileObjects = imageFiles.map(file => ({
            file,
            frame: false,
            lamination: false
        }));

        const updatedFiles = [...group.files, ...newFileObjects];
        onUpdate(group.id, { files: updatedFiles });
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        const pastedFiles = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                pastedFiles.push(items[i].getAsFile());
            }
        }
        if (pastedFiles.length > 0) {
            handleFiles(pastedFiles);
        }
    };

    const toggleOption = (idx, option) => {
        const updatedFiles = group.files.map((f, i) =>
            i === idx ? { ...f, [option]: !f[option] } : f
        );
        onUpdate(group.id, { files: updatedFiles });
    };

    const removeFile = (e, index) => {
        e.stopPropagation();
        const updatedFiles = group.files.filter((_, i) => i !== index);
        onUpdate(group.id, { files: updatedFiles });
    };

    return (
        <div
            className={cn(
                "p-4 border-2 border-dashed rounded-lg transition-all duration-300 shadow-sm",
                scheme.bg,
                scheme.border,
                dragActive ? scheme.active + " shadow-inner scale-[1.005]" : "hover:shadow-md",
                "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 flex-1">
                    <input
                        type="text"
                        value={group.name}
                        onChange={(e) => onUpdate(group.id, { name: e.target.value })}
                        className="text-lg font-bold bg-transparent border-none focus:ring-0 w-32 placeholder:text-muted-foreground/50"
                        placeholder="Group Name"
                    />
                    <span className="text-sm font-medium text-muted-foreground">({group.files.length} images)</span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => inputRef.current?.click()}
                        className="h-8 gap-1.5 font-medium"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Files
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(group.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {group.files.map((fileObj, idx) => {
                    const { file, frame, lamination } = fileObj;
                    const url = URL.createObjectURL(file);
                    return (
                        <div
                            key={idx}
                            className="relative group flex flex-col items-center"
                        >
                            <div
                                className="relative aspect-square w-full rounded-md overflow-hidden bg-muted border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                onClick={() => setPreviewImage(url)}
                                title="Click to preview"
                            >
                                <img
                                    src={url}
                                    alt={`Preview ${idx}`}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 className="w-5 h-5 text-white" />
                                </div>
                                <button
                                    onClick={(e) => removeFile(e, idx)}
                                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="mt-1.5 flex flex-col gap-1 w-full px-1">
                                <label className="flex items-center gap-1.5 cursor-pointer group/opt">
                                    <input
                                        type="checkbox"
                                        className="w-3 h-3 rounded text-primary focus:ring-0 cursor-pointer"
                                        checked={frame}
                                        onChange={() => toggleOption(idx, 'frame')}
                                    />
                                    <span className="text-[10px] font-medium leading-none select-none text-muted-foreground group-hover/opt:text-foreground">Frame</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer group/opt">
                                    <input
                                        type="checkbox"
                                        className="w-3 h-3 rounded text-primary focus:ring-0 cursor-pointer"
                                        checked={lamination}
                                        onChange={() => toggleOption(idx, 'lamination')}
                                    />
                                    <span className="text-[10px] font-medium leading-none select-none text-muted-foreground group-hover/opt:text-foreground">Lamination</span>
                                </label>
                            </div>
                        </div>
                    );
                })}

                <button
                    onClick={() => inputRef.current?.click()}
                    className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-md hover:bg-muted/50 transition-colors"
                >
                    <ImageIcon className="w-6 h-6 mb-1 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Add</span>
                </button>
                <input
                    type="file"
                    ref={inputRef}
                    className="hidden"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFiles(e.target.files)}
                />
            </div>

            {group.files.length === 0 && (
                <div className="text-center py-6 text-muted-foreground pointer-events-none">
                    <p className="text-sm italic">Drag images or Ctrl+V here</p>
                </div>
            )}

            {/* Preview Modal */}
            <Modal
                isOpen={!!previewImage}
                onClose={() => setPreviewImage(null)}
                title="Image Preview"
                className="max-w-4xl"
            >
                {previewImage && (
                    <div className="flex items-center justify-center bg-black/5 rounded-lg overflow-hidden">
                        <img
                            src={previewImage}
                            alt="Full Preview"
                            className="max-w-full max-h-[70vh] object-contain shadow-lg"
                        />
                    </div>
                )}
                <div className="flex justify-end pt-4">
                    <Button onClick={() => setPreviewImage(null)}>Close</Button>
                </div>
            </Modal>
        </div>
    );
}
