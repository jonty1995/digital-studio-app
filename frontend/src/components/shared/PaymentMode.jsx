import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function PaymentMode({ payment, setPayment }) {
    // payment: { mode: 'Cash', total: 0, advance: 0, discount: 0 }

    const due = (Number(payment.total) || 0) - (Number(payment.advance) || 0) - (Number(payment.discount) || 0)

    const handleChange = (e) => {
        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
        setPayment({ ...payment, [e.target.name]: val })
    }

    const modes = ["Cash", "UPI", "Card", "Due"]

    return (
        <div className="space-y-4 rounded-md border p-4 bg-card">
            <h3 className="font-semibold">Payment Details</h3>
            <div className="flex gap-2 flex-wrap">
                {modes.map(m => (
                    <Button
                        key={m}
                        type="button"
                        variant={payment.mode === m ? "default" : "outline"}
                        onClick={() => setPayment({ ...payment, mode: m })}
                        className="flex-1"
                    >
                        {m}
                    </Button>
                ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Total Amount</Label>
                    <Input type="number" name="total" value={payment.total} onChange={handleChange} />
                </div>
                <div className="grid gap-2">
                    <Label>Discount</Label>
                    <Input type="number" name="discount" value={payment.discount} onChange={handleChange} />
                </div>
                <div className="grid gap-2">
                    <Label>Advance / Paid</Label>
                    <Input type="number" name="advance" value={payment.advance} onChange={handleChange} />
                </div>
                <div className="grid gap-2">
                    <Label>Due Amount</Label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm font-medium">
                        {due.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    )
}
