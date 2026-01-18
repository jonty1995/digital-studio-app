
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/shared/FileUpload";

export function ReceiptUploadModal({ isOpen, onClose, onUpload, initialFileId, source = "Bill Payment" }) {

    const handleUploadComplete = (uploadId) => {
        onUpload(uploadId);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Receipt</DialogTitle>
                    <DialogDescription>
                        Upload or link a receipt for this transaction.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <FileUpload
                        file={initialFileId}
                        onUpload={handleUploadComplete}
                        onRemove={() => { }}
                        source={source}
                        instantUpload={true}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
