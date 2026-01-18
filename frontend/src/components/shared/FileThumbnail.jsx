import React from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const FileThumbnail = ({
    fileId,
    isFileAvailable,
    isPdf,
    onView,
    onDownload,
    containerClass = "",
    iconClass = "h-6 w-6 text-red-500",
    imgClass = "w-full h-full object-cover"
}) => {
    // Determine if the file is truly available for interaction
    // We treat 'undefined' or 'null' as available (legacy or not yet checked)
    const isInteractive = fileId && isFileAvailable !== false;

    return (
        <div
            className={cn(
                "rounded-md overflow-hidden border bg-muted flex items-center justify-center relative group transition-all",
                isInteractive ? "cursor-zoom-in hover:shadow-md" : "cursor-default",
                containerClass
            )}
            onClick={(e) => {
                if (isInteractive && onView) {
                    e.stopPropagation();
                    onView(fileId);
                }
            }}
        >
            {isInteractive ? (
                <>
                    {isPdf ? (
                        <FileText className={iconClass} />
                    ) : (
                        <img
                            src={`/api/files/${fileId}`}
                            alt="Preview"
                            className={imgClass}
                            onError={(e) => {
                                // Fallback if image fails to load despite being marked available
                                e.target.parentElement.classList.add('bg-gray-200');
                                e.target.style.display = 'none';
                            }}
                        />
                    )}

                    {onDownload && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full shadow-md hover:scale-110 transition-transform"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDownload(fileId);
                                }}
                                title="Download File"
                            >
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <div className="w-full h-full bg-gray-200 border-inner flex items-center justify-center">
                    {/* Optional: subtle icon for missing file */}
                </div>
            )}
        </div>
    );
};
