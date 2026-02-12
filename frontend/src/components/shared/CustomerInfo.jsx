import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { SimpleAlert } from "@/components/shared/SimpleAlert"
import { useEffect, useState, useRef } from "react"
import { customerService } from "@/services/customerService"

export function CustomerInfo({ customer, setCustomer, onSearch, instanceId, disabled }) {
    const [fetchedSequence, setFetchedSequence] = useState(null);
    const [showNotFoundAlert, setShowNotFoundAlert] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        const fetchSequence = async () => {
            if (!instanceId) return;
            try {
                const data = await customerService.getUniqueSequence(instanceId);
                setFetchedSequence(data && typeof data.sequence === 'number' ? data.sequence : 1);
            } catch (error) {
                console.error("Failed to fetch customer ID sequence:", error);
                setFetchedSequence(1);
            }
        };
        fetchSequence();
    }, [instanceId]);

    // Helper: Generate ID (YYMMDDSequence)
    const generateNewId = () => {
        if (!fetchedSequence) return null;
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const nnn = String(fetchedSequence).padStart(3, '0');
        return `${yy}${mm}${dd}${nnn}`;
    };

    // Auto-Populate Generated ID when Mobile is Empty (Default "New Customer" State)
    useEffect(() => {
        if (!customer.mobile && fetchedSequence) {
            const newId = generateNewId();
            if (newId && customer.id !== newId) {
                setCustomer(prev => ({ ...prev, id: newId }));
            }
        }
    }, [customer.mobile, fetchedSequence, setCustomer, customer.id]);

    // Auto-Search on 9 or 10 digits
    useEffect(() => {
        if (disabled) return;
        const len = customer.mobile?.length;
        if (len === 9 || len === 10) {
            const timer = setTimeout(() => {
                handleSearch(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [customer.mobile]);

    // Track if the update was from a selection
    const isSelectionRef = useRef(false);

    // Suggestions Logic (Debounced)
    useEffect(() => {
        const query = customer.mobile;

        // If this update was due to a selection, reset flag and DO NOT search
        if (isSelectionRef.current) {
            isSelectionRef.current = false;
            setSuggestions([]);
            return;
        }

        // Don't search if disabled, empty, or look like specific ID (9 digits)
        if (disabled || !query || query.length < 3 || /^[0-9]{9}$/.test(query)) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const results = await customerService.getSuggestions(query);
                if (Array.isArray(results)) {
                    setSuggestions(results.slice(0, 5));
                }
            } catch (e) {
                // ignore
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [customer.mobile, disabled]);

    const handleSearch = async (interactive = true) => {
        const isInteractive = typeof interactive === 'boolean' ? interactive : true;
        const value = customer.mobile;
        if (!value) return;

        console.log("Searching for:", value);

        // Reset customer Name/ID (keep mobile unless invalid ID) before search to avoid stale data
        // Actually, let's keep it until we confirm status.

        // Pattern Matching
        const isId = /^[0-9]{9}$/.test(value);      // 9 digits = Customer ID
        const isMobile = /^[0-9]{10}$/.test(value); // 10 digits = Mobile

        try {
            const res = await customerService.search(value);
            if (res) {
                // FOUND (Existing Customer)
                // Whether it was entered as ID or Mobile, if found, we load it.
                // res should contain { id, mobile, name, ... }
                setCustomer(res);
                onSearch && onSearch(); // Propagate event
            } else {
                // NOT FOUND
                if (isId) {
                    // Scenario: 9-Digit ID NOT FOUND
                    // STRICT RULE: ERROR and BLOCK.
                    if (isInteractive) {
                        setShowNotFoundAlert(true);
                        setCustomer(prev => ({ ...prev, mobile: '', id: '', name: '' })); // Clear Input
                    }
                } else {
                    // Scenario: Mobile (10 digits) or Other -> Treat as NEW Customer

                    if (isMobile) {
                        // Valid Mobile -> ID is Mobile
                        setCustomer(prev => ({ ...prev, mobile: value, id: value, name: '' }));
                    } else {
                        // Other format -> Use Generated ID
                        const newId = generateNewId();
                        setCustomer(prev => ({ ...prev, mobile: value, id: newId || '', name: '' }));
                    }
                    onSearch && onSearch();
                }
            }
        } catch (error) {
            console.error("Search error:", error);
            if (isId) {
                if (isInteractive) {
                    setShowNotFoundAlert(true);
                    setCustomer(prev => ({ ...prev, mobile: '', id: '', name: '' }));
                }
            } else {
                // Assume New
                if (isMobile) {
                    setCustomer(prev => ({ ...prev, mobile: value, id: value, name: '' }));
                } else {
                    const newId = generateNewId();
                    setCustomer(prev => ({ ...prev, mobile: value, id: newId || '', name: '' }));
                }
                onSearch && onSearch();
            }
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setCustomer(prev => {
            // If changing mobile input, live-update the ID badge as well
            if (name === 'mobile') {
                // RESTRICTION: Only allow numbers
                if (value && !/^\d*$/.test(value)) {
                    return prev; // Ignore non-numeric input
                }
                return { ...prev, mobile: value, id: value, name: '' };
            }
            return { ...prev, [name]: value };
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            handleSearch(true);
        }
    };

    return (
        <div className="space-y-4 rounded-md border border-blue-200 p-4 bg-blue-50/30">
            <h3 className="font-semibold text-blue-900 uppercase tracking-wide">Customer Information</h3>

            {/* Mobile Number & Customer ID Section */}
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <Label htmlFor="mobile" className="text-blue-900 font-medium">Mobile / Customer ID</Label>
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded border border-blue-200">
                        Customer ID: {customer.id || '...'}
                    </div>
                </div>

                <div className="relative">
                    <Input
                        id="mobile"
                        name="mobile"
                        value={customer.mobile}
                        onChange={handleChange}
                        onBlur={() => {
                            // Delay hiding to allow click
                            setTimeout(() => setSuggestions([]), 200);
                            handleSearch();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter Mobile (10 digits) or ID (9 digits)"
                        className="bg-white border-blue-200 focus-visible:ring-blue-500"
                        disabled={disabled}
                        autoComplete="off"
                    />
                    {suggestions.length > 0 && (
                        <div className="absolute z-50 w-full bg-white border border-blue-200 rounded-md shadow-lg mt-1 max-h-48 overflow-auto">
                            <ul>
                                {suggestions.map(s => (
                                    <li
                                        key={s.id}
                                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-none border-gray-50 text-gray-700"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            isSelectionRef.current = true; // Mark as selection
                                            console.log("Selected suggestion:", s);
                                            setCustomer(prev => ({
                                                ...prev,
                                                mobile: s.mobile || '',
                                                name: s.name || '',
                                                id: s.id || prev.id
                                            }));
                                            setSuggestions([]);
                                        }}
                                    >
                                        <div className="font-medium text-blue-900">{s.mobile}</div>
                                        <div className="text-xs text-gray-500">{s.name} (ID: {s.id})</div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

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
                // Name is always editable
                />
            </div>


            <SimpleAlert
                open={showNotFoundAlert}
                onOpenChange={setShowNotFoundAlert}
                title="Customer Not Found"
                description="The Customer ID you entered does not exist in the database."
            />
        </div >
    )
}
