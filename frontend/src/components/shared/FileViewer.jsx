import React, { useEffect } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FileViewer({ fileId, isOpen, onClose }) {
    if (!isOpen || !fileId) return null;

    const fileUrl = `/api/files/${fileId}`;
    const isPdf = fileId.toLowerCase().endsWith('.pdf');

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleDownload = async () => {
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileId; // Uses the ID (filename) as download name
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download file.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 flex gap-4 z-50">
                <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-none"
                    onClick={handleDownload}
                    title="Download"
                >
                    <Download className="h-5 w-5 mr-2" />
                    Download
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-white/10 hover:bg-white/20 text-white"
                    onClick={onClose}
                >
                    <X className="h-6 w-6" />
                </Button>
            </div>

            {/* Content */}
            <div className="w-full h-full flex items-center justify-center p-4 md:p-8" onClick={onClose}>
                <div
                    className="relative max-w-full max-h-full flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()} // Prevent close when clicking content
                >
                    {isPdf ? (
                        <iframe
                            src={fileUrl}
                            className="w-[85vw] h-[85vh] bg-white rounded-lg shadow-2xl"
                            title="PDF Viewer"
                        />
                    ) : (
                        <img
                            src={fileUrl}
                            alt="Preview"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
