
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CustomerInfo } from "./CustomerInfo";
import { customerService } from "@/services/customerService";

import { ChevronsRight, Loader2, Check, X, AlertCircle } from "lucide-react";
import { fileService } from "@/services/fileService";

export function LinkCustomerModal({ isOpen, onClose, onSuccess }) {
    const [uploadId, setUploadId] = useState("");
    const [customer, setCustomer] = useState({ mobile: '', name: '', id: '' });
    const [loading, setLoading] = useState(false);

    // Verification State
    const [verificationStatus, setVerificationStatus] = useState('idle'); // idle, loading, valid, invalid
    const [verifiedDetails, setVerifiedDetails] = useState(null); // Optional: store verified filename or type

    // Unique instance ID for this session of the modal to handle ID generation sequence
    const [instanceId, setInstanceId] = useState(Date.now().toString());

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setUploadId("");
            setVerificationStatus('idle');
            setVerifiedDetails(null);
            setCustomer({ mobile: '', name: '', id: '' });
            setInstanceId(Date.now().toString());
            setLoading(false);
        }
    }, [isOpen]);

    // Verify Upload ID Effect
    useEffect(() => {
        if (!uploadId.trim()) {
            setVerificationStatus('idle');
            setVerifiedDetails(null);
            return;
        }

        const timer = setTimeout(async () => {
            setVerificationStatus('loading');
            try {
                // Use fileService lookup (which hits /api/files/lookup/{id})
                // Depending on backend, lookup might fail 404 if not found.
                // Assuming fileService.lookup returns file metadata object on success
                const info = await fileService.lookup(uploadId.trim());
                setVerificationStatus('valid');
                setVerifiedDetails(info);
            } catch (error) {
                setVerificationStatus('invalid');
                setVerifiedDetails(null);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [uploadId]);

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
            // Ignore if not found
        }
    };

    const handleSubmit = async () => {
        if (verificationStatus !== 'valid') {
            alert("Please provide a valid Upload ID.");
            return;
        }
        if (!customer.name.trim()) {
            alert("Customer Name is required.");
            return;
        }

        setLoading(true);

        const payload = {
            image: uploadId.trim(),
            customer: {
                id: customer.id,
                name: customer.name,
                mobile: customer.mobile
            },
            items: [], // Empty items
            payment: { mode: "Cash", total: 0, discount: 0, advance: 0 }, // Reset payment
            description: "Linked from Uploads Page"
        };

        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const text = await res.text();
                alert("Failed to link customer: " + text);
            }
        } catch (error) {
            console.error("Link error:", error);
            alert("Error linking customer: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Link Customer to File"
            className="max-w-md"
        >
            <div className="space-y-6 py-4">
                <div className="space-y-2">
                    <Label htmlFor="uploadId">File Upload ID</Label>
                    <div className="relative">
                        <Input
                            id="uploadId"
                            value={uploadId}
                            onChange={(e) => setUploadId(e.target.value)}
                            placeholder="Enter Upload ID (e.g. F251230001)"
                            className={verificationStatus === 'valid' ? "border-green-500 pr-10" : verificationStatus === 'invalid' ? "border-red-500 pr-10" : "pr-10"}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            {verificationStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            {verificationStatus === 'valid' && <Check className="h-4 w-4 text-green-500" />}
                            {verificationStatus === 'invalid' && <X className="h-4 w-4 text-red-500" />}
                        </div>
                    </div>
                    {verificationStatus === 'valid' && verifiedDetails && (
                        <p className="text-xs text-green-600 font-medium">Verified: {verifiedDetails.originalFilename}</p>
                    )}
                    {verificationStatus === 'invalid' && (
                        <p className="text-xs text-red-600 font-medium">Invalid Upload ID. File not found.</p>
                    )}
                    {verificationStatus === 'idle' && (
                        <p className="text-xs text-muted-foreground">
                            Enter the ID of the file you want to link.
                        </p>
                    )}
                </div>

                <CustomerInfo
                    customer={customer}
                    setCustomer={setCustomer}
                    onSearch={handleSearchCustomer}
                    instanceId={instanceId}
                />
            </div>

            <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={loading || verificationStatus !== 'valid'}>
                    {loading ? "Linking..." : "Link Customer"}
                </Button>
            </div>
        </Modal>
    );
}
