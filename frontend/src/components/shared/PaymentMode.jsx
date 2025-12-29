import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IndianRupee, Smartphone, CreditCard, IdCard, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function PaymentMode({ payment, setPayment, minAdvance }) {
    // payment: { mode: 'Cash', total: 0, advance: 0, discount: 0 }

    const due = (Number(payment.total) || 0) - (Number(payment.advance) || 0) - (Number(payment.discount) || 0)

    const handleChange = (e) => {
        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
        setPayment({ ...payment, [e.target.name]: val })
    }

    const modes = [
        { id: "Cash", label: "Cash", icon: IndianRupee },
        { id: "UPI", label: "UPI", icon: Smartphone },
        { id: "Card", label: "Card", icon: CreditCard },
        { id: "Customer Card", label: "Customer Card", icon: IdCard },
        { id: "Bank Transfer", label: "Bank Transfer", icon: Building2 },
    ]

    return (
        <div className="space-y-4 rounded-md border p-4 bg-card">
            <h3 className="font-semibold">Payment Details</h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {modes.map((m) => {
                    const Icon = m.icon;
                    const isSelected = payment.mode === m.id;
                    return (
                        <div
                            key={m.id}
                            onClick={() => setPayment({ ...payment, mode: m.id })}
                            className={cn(
                                "flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-slate-50",
                                isSelected
                                    ? "border-blue-600 bg-blue-50/50 text-blue-600"
                                    : "border-muted text-muted-foreground hover:border-blue-200 hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("h-6 w-6 mb-1", isSelected ? "text-blue-600" : "text-foreground")} />
                            <span className="text-xs font-semibold text-center leading-tight">{m.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label>Total Amount</Label>
                    <Input type="number" name="total" value={payment.total} onChange={handleChange} disabled className="bg-muted font-bold text-foreground opacity-100" />
                </div>
                <div className="grid gap-2">
                    <Label>Discount</Label>
                    <Input type="number" name="discount" min="0" onWheel={(e) => e.target.blur()} value={payment.discount} onChange={handleChange} />
                </div>
                <div className="grid gap-2">
                    <Label>Advance Amount <span className="text-xs text-green-600 font-normal ml-1">(Min: ₹{(minAdvance || 0).toFixed(2)})</span></Label>
                    <Input type="number" name="advance" min="0" onWheel={(e) => e.target.blur()} value={payment.advance} onChange={handleChange} />
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
