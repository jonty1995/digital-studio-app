
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Upload, X, Link, Loader2, FileText, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { fileService } from "@/services/fileService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function FileUpload({ file, onUpload, onRemove, source, instantUpload = true }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [fileType, setFileType] = useState("image");
    const [linkId, setLinkId] = useState("");
    const [linkMessage, setLinkMessage] = useState("");
    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });

    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }

        // Determine Type
        let type = "image";
        let url = null;

        if (file instanceof File) {
            if (file.type.includes("pdf")) type = "pdf";
            url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setFileType(type);
            return () => URL.revokeObjectURL(url);
        } else {
            // String (Filename or ID)
            let filename = file;

            // If it looks like a raw ID (no extension), try to look it up or just construct URL (since backend now supports ID lookup)
            // But for PDF detection we might need extension.
            // Let's assume if no extension, we treat it as image unless we lookup and find it's PDF.
            // For now, let's just rely on backend serving it. Check if it ends with .pdf

            const isPdf = filename.toLowerCase().endsWith(".pdf");
            if (isPdf) type = "pdf";

            // If it doesn't have extension, we might not know it is PDF.
            // But we can try to fetch metadata if needed?
            // Actually, backend serveFile by ID will work for <img> tag.
            // But for PDF icon, we need to know type.

            if (typeof file === 'string' && !file.startsWith('blob:') && !file.includes(".")) {
                // It is likely an ID. Let's try to see if we can deduce type or just assume image for now.
                // Ideally we should lookup, but for performance let's try just setting URL.
                // Backend serveFile is updated to return proper content-type and content-disposition capable of rendering.
            }

            // Serve URL
            if (typeof file === 'string' && !file.startsWith('blob:')) {
                setPreviewUrl(`http://localhost:8081/api/files/${file}`);
            } else {
                setPreviewUrl(file);
            }
            setFileType(type);
        }
    }, [file]);

    const handleFile = async (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreviewUrl(objectUrl);
            setFileType(selectedFile.type.includes("pdf") ? "pdf" : "image");
            setLinkMessage("");

            if (!instantUpload) {
                onUpload(selectedFile);
                return;
            }

            setUploading(true);
            try {
                const res = await fileService.upload(selectedFile, source);
                // Save Upload ID instead of Filename
                onUpload(res.uploadId);
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

        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const pastedFile = items[i].getAsFile();
                if (pastedFile && (pastedFile.type.startsWith("image/") || pastedFile.type === "application/pdf")) {
                    e.preventDefault();
                    // Re-use logic
                    const objectUrl = URL.createObjectURL(pastedFile);
                    setPreviewUrl(objectUrl);
                    setFileType(pastedFile.type.includes("pdf") ? "pdf" : "image");
                    setLinkMessage("");

                    if (!instantUpload) {
                        onUpload(pastedFile);
                        return;
                    }

                    setUploading(true);
                    try {
                        const res = await fileService.upload(pastedFile, source);
                        onUpload(res.uploadId);
                    } catch (err) {
                        console.error(err);
                        showAlert("Upload Error", "Upload failed. Please try again.");
                        onRemove();
                    } finally {
                        setUploading(false);
                    }
                    return; // Verify one file only for now as per this component design
                }
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
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 bg-pink-100 hover:bg-pink-200 text-pink-700"
                                onClick={() => navigator.clipboard.writeText(file.split('.')[0])}
                                title="Copy ID"
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    )}

                    {/* Preview Section - Moved Here */}
                    {previewUrl && (
                        <div className="space-y-2 pt-2">
                            <div className="relative inline-block group">
                                {fileType === "pdf" ? (
                                    <div className="h-32 w-32 flex flex-col items-center justify-center bg-white border border-pink-200 rounded-lg shadow-sm p-2 text-center">
                                        <FileText className="h-10 w-10 text-red-500 mb-2" />
                                        <span className="text-xs text-gray-600 break-all line-clamp-2">
                                            {file instanceof File ? file.name : file}
                                        </span>
                                    </div>
                                ) : (
                                    <img
                                        src={previewUrl}
                                        alt="Preview"
                                        className="h-32 w-32 object-cover rounded-lg border border-pink-200 shadow-sm"
                                    />
                                )}

                                <button
                                    onClick={() => { onRemove(); setLinkMessage(""); }}
                                    className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-red-600 transition-colors z-10"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <SimpleAlert
                open={alertState.open}
                onOpenChange={(open) => setAlertState(prev => ({ ...prev, open }))}
                title={alertState.title}
                description={alertState.description}
            />
        </div>
    )
}
