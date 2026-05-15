import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X, Image as ImageIcon, Plus, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";

export function LabPhotoGroup({ group, onUpdate, onRemove, index, allAddons, pricingRules }) {
    const [dragActive, setDragActive] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [showManualAddonInput, setShowManualAddonInput] = useState(false);
    const [newManualAddon, setNewManualAddon] = useState("");
    const inputRef = useRef(null);

    // Filter addons based on pricing rules for this photo item
    const configAddons = (pricingRules || [])
        .filter(r => r.photoItemId === group.photoItemId || r.photoItemName === group.name)
        .flatMap(r => r.addonNames || r.addons || []);
    
    // Remove duplicates and combine with manual ones
    const availableAddons = Array.from(new Set([...configAddons, ...(group.manualAddons || [])]));

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

    const formatBytes = (bytes, decimals = 2) => {
        if (!bytes || bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const groupTotalSize = group.files.reduce((acc, f) => acc + (f.file?.size || 0), 0);

    const handleFiles = (newFiles) => {
        const imageFiles = Array.from(newFiles).filter(file => file.type.startsWith("image/"));
        if (imageFiles.length === 0) return;

        const newFileObjects = imageFiles.map(file => ({
            file,
            selectedAddons: []
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

    const toggleAddon = (idx, addonName) => {
        const updatedFiles = group.files.map((f, i) => {
            if (i !== idx) return f;
            const currentSelected = f.selectedAddons || [];
            const newSelected = currentSelected.includes(addonName)
                ? currentSelected.filter(a => a !== addonName)
                : [...currentSelected, addonName];
            return { ...f, selectedAddons: newSelected };
        });
        onUpdate(group.id, { files: updatedFiles });
    };

    const addManualAddon = () => {
        if (!newManualAddon.trim()) return;
        const currentManual = group.manualAddons || [];
        if (!currentManual.includes(newManualAddon.trim())) {
            onUpdate(group.id, { manualAddons: [...currentManual, newManualAddon.trim()] });
        }
        setNewManualAddon("");
        setShowManualAddonInput(false);
    };

    const removeManualAddon = (addonName) => {
        const updatedManual = (group.manualAddons || []).filter(a => a !== addonName);
        // Also remove from all files
        const updatedFiles = group.files.map(f => ({
            ...f,
            selectedAddons: (f.selectedAddons || []).filter(a => a !== addonName)
        }));
        onUpdate(group.id, { manualAddons: updatedManual, files: updatedFiles });
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
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-2 flex-1">
                    <input
                        type="text"
                        value={group.name}
                        onChange={(e) => onUpdate(group.id, { name: e.target.value })}
                        className="text-lg font-bold bg-transparent border-none focus:ring-0 w-32 placeholder:text-muted-foreground/50"
                        placeholder="Group Name"
                    />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-muted-foreground">{group.files.length} images</span>
                        {group.files.length > 0 && (
                            <span className="text-[10px] text-muted-foreground/70 -mt-1">{formatBytes(groupTotalSize)} total</span>
                        )}
                    </div>
                    {group.photoItemName && (
                        <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-tighter">
                            {group.photoItemName}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex flex-wrap gap-1 mr-4">
                        {group.manualAddons?.map(addon => (
                            <span key={addon} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-full border border-amber-200 shadow-sm">
                                {addon}
                                <X className="w-3 h-3 cursor-pointer hover:text-amber-900" onClick={() => removeManualAddon(addon)} />
                            </span>
                        ))}
                        {showManualAddonInput ? (
                            <div className="flex items-center gap-1">
                                <input
                                    autoFocus
                                    type="text"
                                    value={newManualAddon}
                                    onChange={(e) => setNewManualAddon(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addManualAddon()}
                                    className="h-6 w-24 text-[10px] px-2 rounded border focus:ring-1"
                                    placeholder="Addon name..."
                                />
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={addManualAddon}><Plus className="w-3 h-3" /></Button>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowManualAddonInput(false)}><X className="w-3 h-3" /></Button>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowManualAddonInput(true)}
                                className="h-7 px-2 text-[10px] gap-1 border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-amber-700"
                            >
                                <Plus className="w-3 h-3" /> Manual Addon
                            </Button>
                        )}
                    </div>

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

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {group.files.map((fileObj, idx) => {
                    const { file, selectedAddons, name } = fileObj;
                    const url = file ? URL.createObjectURL(file) : null;
                    const fileName = file ? file.name : (name || "Processed Image");
                    
                    return (
                        <div
                            key={idx}
                            className="relative group flex flex-col items-center"
                        >
                            <div
                                className="relative aspect-square w-full rounded-md overflow-hidden bg-muted border cursor-pointer hover:ring-2 hover:ring-primary transition-all flex items-center justify-center shadow-sm"
                                onClick={() => url && setPreviewImage(url)}
                                title={url ? "Click to preview" : "Preview not available after refresh"}
                            >
                                {url ? (
                                    <img
                                        src={url}
                                        alt={`Preview ${idx}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-muted-foreground/40">
                                        <ImageIcon className="w-8 h-8 mb-1" />
                                        <span className="text-[8px] font-bold uppercase truncate max-w-[90%] px-1">{fileName}</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 className="w-5 h-5 text-white" />
                                </div>
                                <button
                                    onClick={(e) => removeFile(e, idx)}
                                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive"
                                >
                                    <X className="w-3 h-3" />
                                </button>

                                {selectedAddons?.length > 0 && (
                                    <div className="absolute bottom-1 left-1 flex flex-wrap gap-0.5">
                                        {selectedAddons.map(a => (
                                            <div key={a} className="w-2 h-2 rounded-full bg-primary border border-white shadow-sm" title={a}></div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-2 flex flex-col gap-1 w-full px-1 overflow-hidden">
                                <div className="text-[9px] font-bold text-muted-foreground/60 uppercase truncate">
                                    {fileName}
                                </div>
                                <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto pr-1 mt-1 border-t pt-1">
                                    {availableAddons.map(addon => (
                                        <label key={addon} className="flex items-center gap-2 cursor-pointer group/opt">
                                            <input
                                                type="checkbox"
                                                className="w-3.5 h-3.5 rounded border-muted-foreground/30 text-primary focus:ring-0 cursor-pointer"
                                                checked={selectedAddons?.includes(addon)}
                                                onChange={() => toggleAddon(idx, addon)}
                                            />
                                            <span className="text-[11px] font-bold leading-tight select-none text-muted-foreground group-hover/opt:text-foreground truncate">{addon}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}

                <button
                    onClick={() => inputRef.current?.click()}
                    className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-md hover:bg-muted/50 transition-colors bg-white/50"
                >
                    <Plus className="w-6 h-6 mb-1 text-muted-foreground" />
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
