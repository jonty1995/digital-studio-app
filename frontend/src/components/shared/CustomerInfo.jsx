import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { customerService } from "@/services/customerService"

export function CustomerInfo({ customer, setCustomer, onSearch, instanceId, disabled }) {
    const [fetchedSequence, setFetchedSequence] = useState(null);

    useEffect(() => {
        // Fetch the sequence only once when the component mounts or instanceId changes
        const fetchSequence = async () => {
            if (!instanceId) return;
            try {
                const data = await customerService.getUniqueSequence(instanceId);
                if (data && typeof data.sequence === 'number') {
                    setFetchedSequence(data.sequence);
                } else {
                    setFetchedSequence(1);
                }
            } catch (error) {
                console.error("Failed to fetch customer ID sequence:", error);
                // Fallback to 1 as requested
                setFetchedSequence(1);
            }
        };
        fetchSequence();
    }, []);

    useEffect(() => {
        if (customer.mobile && customer.mobile.length > 0) {
            // If mobile is provided, ID is the mobile number
            // Only update if it's different to avoid loops
            if (customer.id !== customer.mobile) {
                setCustomer(prev => ({ ...prev, id: prev.mobile }));
            }
        } else {
            // If no mobile, use Generated ID
            if (fetchedSequence !== null) {
                const now = new Date();
                const yy = String(now.getFullYear()).slice(-2);
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const nnn = String(fetchedSequence).padStart(3, '0');
                const generatedId = `${yy}${mm}${dd}${nnn}`;

                if (customer.id !== generatedId) {
                    setCustomer(prev => ({ ...prev, id: generatedId }));
                }
            }
        }
    }, [customer.mobile, fetchedSequence, setCustomer, customer.id]);

    const handleChange = (e) => {
        setCustomer({ ...customer, [e.target.name]: e.target.value })
    }

    return (
        <div className="space-y-4 rounded-md border border-blue-200 p-4 bg-blue-50/30">
            <h3 className="font-semibold text-blue-900 uppercase tracking-wide">Customer Information</h3>

            {/* Mobile Number & Customer ID Section */}
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <Label htmlFor="mobile" className="text-blue-900 font-medium">Mobile Number (Optional)</Label>
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded border border-blue-200">
                        Customer ID: {customer.id || '...'}
                    </div>
                </div>

                <Input
                    id="mobile"
                    name="mobile"
                    value={customer.mobile}
                    onChange={handleChange}
                    onBlur={onSearch}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    placeholder="Enter mobile number"
                    className="bg-white border-blue-200 focus-visible:ring-blue-500"
                    disabled={disabled}
                />

                <p className="text-xs text-blue-600">
                    If not provided, an ID will be auto-generated
                </p>
            </div>

            {/* Customer Name Section */}
            <div className="grid gap-2">
                <Label htmlFor="name" className="text-blue-900 font-medium">Name</Label>
                <Input
                    id="name"
                    name="name"
                    value={customer.name}
                    onChange={handleChange}
                    placeholder="Enter customer name"
                    className="bg-white border-blue-200 focus-visible:ring-blue-500"
                    disabled={disabled}
                />
            </div>
        </div>
    )
}
