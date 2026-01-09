
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Upload, X, Link, Loader2, FileText } from "lucide-react"
import { useEffect, useState } from "react"
import { fileService } from "@/services/fileService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { CopyButton } from "@/components/shared/CopyButton";

export function FileUpload({ file, onUpload, onRemove, source, instantUpload = true, multiple = false }) {
    const [previews, setPreviews] = useState([]); // Array of { url, type, originalFile, id? }
    const [uploading, setUploading] = useState(false);
    const [linkId, setLinkId] = useState("");
    const [linkMessage, setLinkMessage] = useState("");
    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });

    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    useEffect(() => {
        if (!file) {
            setPreviews([]);
            return;
        }

        const files = Array.isArray(file) ? file : [file];
        if (files.length === 0) {
            setPreviews([]);
            return;
        }

        const newPreviews = files.map(f => {
            let type = "image";
            let url = null;

            if (f instanceof File) {
                if (f.type.includes("pdf")) type = "pdf";
                url = URL.createObjectURL(f);
                return { url, type, originalFile: f, cleanup: true };
            } else {
                // String (ID or specific path)
                if (typeof f === 'string') {
                    const isPdf = f.toLowerCase().endsWith(".pdf");
                    if (isPdf) type = "pdf";
                    url = (!f.startsWith('blob:') && !f.startsWith('http')) ? `http://localhost:8081/api/files/${f}` : f;
                    // Determine type from extension if ID? Backend might serve it.
                    // Best guess for icon rendering.
                    return { url, type, originalFile: f, cleanup: false };
                }
                return null;
            }
        }).filter(Boolean);

        setPreviews(newPreviews);

        return () => {
            newPreviews.forEach(p => {
                if (p.cleanup && p.url) URL.revokeObjectURL(p.url);
            });
        };
    }, [file]);

    const handleFile = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {

            if (!multiple && selectedFiles.length > 1) {
                showAlert("Single File Only", "Please select only one file.");
                return;
            }

            // If multiple, we append or replace? Usually Input replaces.
            // If we want to append, we need to merge with existing props `file`.
            // But usually input onChange replaces the selection.

            if (!instantUpload) {
                // Pass raw files back
                onUpload(multiple ? selectedFiles : selectedFiles[0]);
                return;
            }

            setUploading(true);
            try {
                // Upload One by One or Parallel
                const results = await Promise.all(selectedFiles.map(f => fileService.upload(f, source)));
                const ids = results.map(r => r.uploadId);
                onUpload(multiple ? ids : ids[0]);
            } catch (err) {
                console.error(err);
                showAlert("Upload Error", "Upload failed. Please try again.");
                onRemove();
            } finally {
                setUploading(false);
            }
        }
    }

    const handleLink = async () => {
        if (!linkId) return;
        try {
            setUploading(true);
            const res = await fileService.lookup(linkId);

            // Validate Source Validation
            // Exception: If file source is "Uploads", allow linking anywhere.
            if (source && res.source !== source && res.source !== "Uploads") {
                showAlert("Source Mismatch", `Cannot link file. It belongs to '${res.source || "Unknown"}', but expected '${source}'.`);
                setUploading(false);
                return;
            }

            onUpload(res.uploadId); // Save ID
            setLinkMessage("Photo linked successfully!");
            setFileType(res.filename.toLowerCase().endsWith(".pdf") ? "pdf" : "image");
            setLinkId("");
        } catch (error) {
            showAlert("Not Found", "File ID not found.");
        } finally {
            setUploading(false);
        }
    }

    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const filesToProcess = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const pastedFile = items[i].getAsFile();
                if (pastedFile && (pastedFile.type.startsWith("image/") || pastedFile.type === "application/pdf")) {
                    filesToProcess.push(pastedFile);
                }
            }
        }

        if (filesToProcess.length > 0) {
            e.preventDefault();
            if (!multiple && filesToProcess.length > 1) {
                // Take first or warn?
                // Warn.
                showAlert("Single File Only", "Clipboard contains multiple files, but only single file is allowed.");
                return;
            }

            const finalFiles = multiple ? filesToProcess : [filesToProcess[0]];

            if (!instantUpload) {
                onUpload(multiple ? finalFiles : finalFiles[0]);
                return;
            }

            setUploading(true);
            try {
                const results = await Promise.all(finalFiles.map(f => fileService.upload(f, source)));
                const ids = results.map(r => r.uploadId);
                onUpload(multiple ? ids : ids[0]);
            } catch (err) {
                console.error(err);
                showAlert("Upload Error", "Upload failed. Please try again.");
                onRemove();
            } finally {
                setUploading(false);
            }
        }
    };

    return (
        <div
            className="w-full p-4 border border-pink-200 rounded-lg bg-pink-50/50 space-y-4"
            onPaste={handlePaste}
        >
            <h3 className="font-bold text-pink-900 uppercase text-sm tracking-wide">File Upload</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload Box */}
                <div className="relative border-2 border-dashed border-pink-300 rounded-lg bg-white p-6 flex flex-col items-center justify-center text-center space-y-2 hover:bg-pink-50/30 transition-colors cursor-pointer group focus-within:ring-2 focus-within:ring-pink-500 focus-within:ring-offset-2 outline-none">
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/png, image/jpeg, image/gif, application/pdf"
                        onChange={handleFile}
                        disabled={uploading}
                        multiple={multiple}
                    />
                    <div className="rounded-full bg-pink-100 p-2 text-pink-500 group-hover:bg-pink-200 transition-colors">
                        {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                            {uploading ? "Uploading..." : "Click to upload"} <span className="text-pink-600 font-normal">{!uploading && "or drag and drop"}</span>
                        </p>
                        <p className="text-xs text-pink-400">
                            Paste (Ctrl+V) also supported
                        </p>
                        <p className="text-xs text-pink-400">PDF, PNG, JPG up to 10MB</p>
                    </div>
                </div>

                {/* Link ID Section */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                        <Input
                            placeholder="Link Existing File ID"
                            className="bg-white border-pink-200 focus-visible:ring-pink-500 text-sm"
                            value={linkId}
                            onChange={(e) => setLinkId(e.target.value)}
                        />
                        <Button
                            variant="outline"
                            className="bg-white border-pink-200 hover:bg-pink-50 text-gray-900"
                            onClick={handleLink}
                            disabled={uploading}
                        >
                            Link
                        </Button>
                    </div>
                    {linkMessage && <p className="text-xs text-green-600 font-medium">{linkMessage}</p>}

                    {/* Show Generated ID after upload */}
                    {(typeof file === 'string' && !file.startsWith('blob:') && !linkMessage) && (
                        <div className="text-xs font-semibold text-pink-600 flex items-center gap-2">
                            <span>Upload ID : {file.split('.')[0]}</span>
                            <CopyButton
                                text={file.split('.')[0]}
                                className="h-5 w-5 bg-pink-100 hover:bg-pink-200 text-pink-700"
                                iconClass="text-pink-700"
                                title="Copy ID"
                            />
                        </div>
                    )}

                    {/* Preview Section - Moved Here */}
                </div>
            </div>

            {/* Previews Grid */}
            {previews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
                    {previews.map((preview, index) => (
                        <div key={index} className="relative group">
                            {preview.type === "pdf" ? (
                                <div className="h-24 w-full flex flex-col items-center justify-center bg-white border border-pink-200 rounded-lg shadow-sm p-2 text-center">
                                    <FileText className="h-8 w-8 text-red-500 mb-1" />
                                    <span className="text-[10px] text-gray-600 break-all line-clamp-2 leading-tight">
                                        {preview.originalFile instanceof File ? preview.originalFile.name : preview.originalFile}
                                    </span>
                                </div>
                            ) : (
                                <img
                                    src={preview.url}
                                    alt="Preview"
                                    className="h-24 w-full object-cover rounded-lg border border-pink-200 shadow-sm"
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    if (multiple) {
                                        // Filter out this index.
                                        // Need to call onUpload with new array.
                                        const currentFiles = Array.isArray(file) ? file : [file];
                                        const newFiles = currentFiles.filter((_, i) => i !== index);
                                        onUpload(newFiles.length > 0 ? newFiles : null);
                                    } else {
                                        onRemove();
                                        setLinkMessage("");
                                    }
                                }}
                                className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-red-600 transition-colors z-10"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <SimpleAlert
                open={alertState.open}
                onOpenChange={(open) => setAlertState(prev => ({ ...prev, open }))}
                title={alertState.title}
                description={alertState.description}
            />
        </div>
    )
}
