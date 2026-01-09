
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CustomerInfo } from "./CustomerInfo";
import { FileUpload } from "./FileUpload";
import { fileService } from "@/services/fileService";
import { customerService } from "@/services/customerService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";

export function UnifiedUploadModal({ isOpen, onClose, onSuccess }) {
    const [files, setFiles] = useState([]); // Array of Files or Strings (IDs)
    const [includeCustomer, setIncludeCustomer] = useState(false);
    const [customer, setCustomer] = useState({ mobile: '', name: '', id: '' });
    const [loading, setLoading] = useState(false);
    const [instanceId, setInstanceId] = useState(Date.now().toString());

    // Alert State
    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });
    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    useEffect(() => {
        if (isOpen) {
            setFiles([]);
            setIncludeCustomer(false); // Disabled by default
            setCustomer({ mobile: '', name: '', id: '' });
            setInstanceId(Date.now().toString());
            setLoading(false);
        }
    }, [isOpen]);

    const handleSearchCustomer = async () => {
        if (!customer.mobile) return;
        try {
            const found = await customerService.search(customer.mobile);
            if (found) {
                setCustomer(prev => ({
                    ...prev,
                    name: found.name || '',
                    id: found.id || prev.mobile
                }));
            }
        } catch (error) {
            // Ignore
        }
    };

    const handleSubmit = async () => {
        if (files.length === 0) {
            showAlert("File Required", "Please select at least one file.");
            return;
        }

        if (includeCustomer) {
            if (!customer.name.trim()) {
                showAlert("Name Required", "Customer Name is required when linking.");
                return;
            }
        }

        setLoading(true);

        try {
            // Process Each File
            const promises = files.map(async (fileItem) => {
                // 1. Upload File
                let uploadId = "";

                if (fileItem instanceof File) {
                    const uploaded = await fileService.upload(fileItem, "Uploads");
                    uploadId = uploaded.uploadId;
                } else {
                    uploadId = fileItem; // ID already (if drag-drop logic somehow passed IDs or manual mode passed IDs)
                }

                // 2. Link Customer (if enabled)
                if (includeCustomer && uploadId && customer.id) {
                    const payload = {
                        uploadId: uploadId,
                        customerId: customer.id
                    };

                    const res = await fetch("/api/files/link", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        const text = await res.text();
                        throw new Error(`Failed to link file ${uploadId}: ` + text);
                    }
                }
            });

            await Promise.all(promises);

            onSuccess();
            onClose();

        } catch (error) {
            console.error("Process error:", error);
            showAlert("Error", "Operation failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Upload Files"
            className="max-w-2xl" // Wider to accommodate both if needed
        >
            <div className="space-y-6 py-4">
                {/* File Upload Section */}
                <div className="space-y-2">
                    <Label>Select Files</Label>
                    <FileUpload
                        file={files}
                        onUpload={setFiles}
                        onRemove={() => setFiles([])}
                        source="Uploads"
                        instantUpload={false} // Manual upload
                        multiple={true}
                    />
                </div>

                {/* Customer Toggle */}
                <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox
                        id="includeCustomer"
                        checked={includeCustomer}
                        onCheckedChange={setIncludeCustomer}
                    />
                    <Label htmlFor="includeCustomer" className="text-sm font-medium cursor-pointer">
                        Link Customer Information (Optional)
                    </Label>
                </div>

                {/* Customer Info Section (Conditional) */}
                {includeCustomer && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-300 bg-slate-50 p-4 rounded-lg border">
                        <CustomerInfo
                            customer={customer}
                            setCustomer={setCustomer}
                            onSearch={handleSearchCustomer}
                            instanceId={instanceId}
                        />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? "Processing..." : (includeCustomer ? "Upload & Link" : "Upload")}
                </Button>
            </div>

            <SimpleAlert
                open={alertState.open}
                onOpenChange={(open) => setAlertState(prev => ({ ...prev, open }))}
                title={alertState.title}
                description={alertState.description}
            />
        </Modal>
    );
}
