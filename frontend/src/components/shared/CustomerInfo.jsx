import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function CustomerInfo({ customer, setCustomer, onSearch }) {
    const handleChange = (e) => {
        setCustomer({ ...customer, [e.target.name]: e.target.value })
    }

    return (
        <div className="space-y-4 rounded-md border p-4 bg-card">
            <h3 className="font-semibold">Customer Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <div className="flex gap-2">
                        <Input
                            id="mobile"
                            name="mobile"
                            value={customer.mobile}
                            onChange={handleChange}
                            placeholder="Enter 10 digit number"
                        />
                        <Button type="button" onClick={onSearch} variant="secondary">Search</Button>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="name">Customer Name</Label>
                    <Input
                        id="name"
                        name="name"
                        value={customer.name}
                        onChange={handleChange}
                        placeholder="Name"
                    />
                </div>
            </div>
            {customer.id && <p className="text-sm text-muted-foreground">ID: {customer.id}</p>}
        </div>
    )
}
