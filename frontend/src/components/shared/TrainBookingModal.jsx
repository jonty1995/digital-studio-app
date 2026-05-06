// Train Booking Modal - Hardened for Stability and Aadhaar Support
import { useState, useEffect, useMemo, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CustomerInfo } from "./CustomerInfo";
import { PaymentMode } from "./PaymentMode";
import { trainBookingService } from "@/services/trainBookingService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { StationSearch } from "./StationSearch";
import { TrainSearch } from "./TrainSearch";
import { DateUtils } from "@/utils/DateUtils";
import { UserPlus, Trash2, Users, Train, CreditCard, Lock, Phone, Calendar as CalendarIcon, Fingerprint, AlertCircle, ArrowLeftRight, Edit2, Check } from "lucide-react";

// Safely converts any date format (string, Date object, or Java array [Y,M,D]) to YYYY-MM-DD
function safeDateString(val) {
    if (!val) return '';
    if (typeof val === 'string') return val.substring(0, 10);
    if (val instanceof Date) return val.toISOString().substring(0, 10);
    if (Array.isArray(val) && val.length >= 3) {
        const [y, m, d] = val;
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return String(val).substring(0, 10);
}
import { cn } from "@/lib/utils";

const QUOTAS = [
    { value: "GN", label: "General (GN)", max: 6 },
    { value: "TQ", label: "Tatkal (TQ)", max: 4 },
    { value: "PT", label: "Premium Tatkal (PT)", max: 4 },
    { value: "LD", label: "Ladies (LD)", max: 6 },
    { value: "SS", label: "Senior Citizen (SS)", max: 6 },
    { value: "HP", label: "Physically Handicapped (HP)", max: 6 }
];

const FOOD_OPTIONS = [
    { value: "No Choice", label: "No Choice" },
    { value: "Veg", label: "Veg" },
    { value: "Non-Veg", label: "Non-Veg" }
];

const GENDERS = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Transgender", label: "Trans" }
];

export function TrainBookingModal({ isOpen, onClose, onSave, booking = null }) {
    // State initialization
    const [customer, setCustomer] = useState({ mobile: '', name: '', id: '' });
    const [details, setDetails] = useState({
        trainNumber: "", trainName: "", pnr: "", fromStation: "", toStation: "",
        journeyDate: new Date().toISOString().split('T')[0],
        travelClass: "SL", quota: "GN", amount: "", basePrice: "",
        description: "", irctcUser: "", irctcPass: "", contactMobile: "", contactEmail: ""
    });
    const [passengers, setPassengers] = useState([{ name: "", age: "", gender: "Male", food: "No Choice", berth: "No Choice", aadhaar: "" }]);
    const [payment, setPayment] = useState({ mode: 'Cash', total: 0, discount: 0, advance: 0, commission: 0 });
    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });
    const [saving, setSaving] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [editingIdx, setEditingIdx] = useState(0); // Track which row is editable
    
    // Safety flag to prevent loops during initialization
    const isInitializing = useRef(false);

    // Sync state when modal opens or booking changes
    useEffect(() => {
        if (!isOpen) {
            isInitializing.current = false;
            setCustomer({ mobile: '', name: '', id: '' });
            setDetails({
                trainNumber: "", trainName: "", pnr: "", fromStation: "", toStation: "",
                journeyDate: new Date().toISOString().split('T')[0],
                travelClass: "SL", quota: "GN", amount: "", basePrice: "",
                description: "", irctcUser: "", irctcPass: "", contactMobile: "", contactEmail: "",
                bookedBy: "Self"
            });
            setPassengers([{ name: "", age: "", gender: "Male", food: "No Choice", berth: "No Choice", aadhaar: "" }]);
            setPayment({ mode: 'Cash', total: 0, discount: 0, advance: 0, commission: 0 });
            setSuggestions([]);
            return;
        }

        isInitializing.current = true;
        if (booking) {
            setCustomer({
                mobile: booking.customer?.mobile || '',
                name: booking.customer?.name || '',
                id: booking.customer?.id ? String(booking.customer.id) : ''
            });
            setDetails({
                trainNumber: booking.trainNumber || '',
                trainName: booking.trainName || '',
                pnr: booking.pnr || '',
                fromStation: booking.fromStation || '',
                toStation: booking.toStation || '',
                journeyDate: safeDateString(booking.journeyDate),
                travelClass: booking.travelClass || 'SL',
                quota: booking.quota || 'GN',
                amount: booking.amount?.toString() || '',
                basePrice: booking.basePrice?.toString() || '',
                description: booking.description || '',
                irctcUser: booking.irctcUser || '',
                irctcPass: booking.irctcPass || '',
                contactMobile: booking.contactMobile || booking.customer?.mobile || '',
                contactEmail: booking.contactEmail || '',
                bookedBy: booking.bookedBy || 'Self'
            });

            if (booking.passengersJson) {
                try {
                    const ps = JSON.parse(booking.passengersJson);
                    if (Array.isArray(ps)) {
                        setPassengers(ps.map(p => ({
                            name: p.name || "", age: p.age || "", gender: p.gender || "Male",
                            food: p.food || "No Choice", berth: p.berth || "No Choice", aadhaar: p.aadhaar || ""
                        })));
                    }
                } catch (e) { console.error("Passengers parse error", e); }
            }

            if (booking.payment) {
                setPayment({
                    mode: booking.payment.paymentMode || 'Cash',
                    total: booking.payment.totalAmount || 0,
                    discount: booking.payment.discountAmount || 0,
                    advance: booking.payment.advanceAmount || 0,
                    commission: booking.payment.commission || 0
                });
            }
        }
        // Small delay to allow states to settle before letting other effects fire
        setTimeout(() => { isInitializing.current = false; }, 50);
        
        // When opening a new booking, reset editing state
        if (!booking) setEditingIdx(0);
        else setEditingIdx(-1); // In edit mode, all start as cards
    }, [isOpen, booking]);

    // Fetch history suggestions and auto-fill IRCTC when customer changes
    useEffect(() => {
        if (!isOpen || booking || !customer.mobile || customer.mobile.length < 10) {
            setSuggestions([]);
            return;
        }

        const fetchHistory = async () => {
            try {
                const data = await trainBookingService.getSuggestions(customer.mobile);
                setSuggestions(data || []);
                
                if (data?.length > 0) {
                    // Auto-fill IRCTC credentials from most recent booking
                    const lastBooking = data[0];
                    setDetails(prev => ({
                        ...prev,
                        irctcUser: prev.irctcUser || lastBooking.irctcUser || "",
                        irctcPass: prev.irctcPass || lastBooking.irctcPass || ""
                    }));
                }
            } catch (err) {
                console.error("Failed suggestions load", err);
            }
        };
        const tid = setTimeout(fetchHistory, 400);
        return () => clearTimeout(tid);
    }, [customer.mobile, booking, isOpen]);

    // Derived values
    const quotaInfo = useMemo(() => QUOTAS.find(q => q.value === details.quota) || QUOTAS[0], [details.quota]);
    const isLimitExceeded = passengers.length > quotaInfo.max;

    const berthOptions = useMemo(() => {
        const isSleeper = ["SL", "3A", "2A", "1A"].includes(details.travelClass);
        const isChair = ["CC", "2S"].includes(details.travelClass);
        if (isSleeper) return ["No Choice", "Lower", "Middle", "Upper", "Side Lower", "Side Upper"];
        if (isChair) return ["No Choice", "Window", "Aisle"];
        return ["No Choice"];
    }, [details.travelClass]);

    // Track last synced mobile to allow updates without overwriting manual changes
    const lastSyncedMobileRef = useRef("");

    // Auto-fill mobile number from customer info
    useEffect(() => {
        if (isInitializing.current || booking) return;
        const mob = customer.mobile;
        if (mob && (details.contactMobile === lastSyncedMobileRef.current || !details.contactMobile)) {
            setDetails(prev => ({ ...prev, contactMobile: mob }));
            lastSyncedMobileRef.current = mob;
        }
    }, [customer.mobile, booking]);

    // Auto-sync payment total with amount
    useEffect(() => {
        if (isInitializing.current || booking) return;
        const amt = parseFloat(details.amount) || 0;
        setPayment(prev => ({ ...prev, total: amt, advance: amt }));
    }, [details.amount, booking]);

    // Sync Base Price to Total Amount
    useEffect(() => {
        if (isInitializing.current || booking) return;
        if (details.basePrice && !details.amount) {
            setDetails(prev => ({ ...prev, amount: prev.basePrice }));
        }
    }, [details.basePrice, booking]);

    const swapStations = () => {
        setDetails(prev => ({
            ...prev,
            fromStation: prev.toStation,
            toStation: prev.fromStation
        }));
    };

    const showAlert = (title, description) => setAlertState({ open: true, title, description });

    const handleSave = async () => {
        if (!customer.name || !details.amount || !details.contactMobile) {
            return showAlert("Missing Info", "Customer Name, Amount, and Contact Mobile are required.");
        }
        if (isLimitExceeded) return showAlert("Limit Exceeded", `Max ${quotaInfo.max} passengers allowed for this quota.`);
        
        setSaving(true);
        try {
            const payload = {
                customer: { id: customer.id || null, name: customer.name, mobile: customer.mobile },
                trainNumber: details.trainNumber, trainName: details.trainName,
                pnr: details.pnr, fromStation: details.fromStation, toStation: details.toStation,
                journeyDate: details.journeyDate ? details.journeyDate + "T00:00:00" : null,
                travelClass: details.travelClass, quota: details.quota,
                passengersJson: JSON.stringify(passengers),
                amount: parseFloat(details.amount), basePrice: parseFloat(details.basePrice) || 0,
                description: details.description, status: booking?.status || "Pending",
                irctcUser: details.irctcUser, irctcPass: details.irctcPass,
                contactMobile: details.contactMobile, contactEmail: details.contactEmail,
                bookedBy: details.bookedBy,
                payment: {
                    paymentMode: payment.mode, totalAmount: parseFloat(payment.total) || 0,
                    advanceAmount: parseFloat(payment.advance) || 0, discountAmount: parseFloat(payment.discount) || 0,
                    commission: parseFloat(payment.commission) || 0,
                    dueAmount: (parseFloat(payment.total) || 0) - (parseFloat(payment.advance) || 0) - (parseFloat(payment.discount) || 0)
                }
            };
            await onSave(payload, booking?.id);
            onClose();
        } catch (e) {
            console.error("Save error", e);
            showAlert("Error", "Failed to save booking. Please check console.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={booking ? "Edit Train Booking" : "New Train Booking"}
            className="sm:max-w-[750px]"
            preventOutsideClose={true}
        >
            <div className="flex flex-col gap-8 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar px-1 pb-6">
                
                {/* Customer Section */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm">
                    <CustomerInfo
                        customer={customer}
                        setCustomer={setCustomer}
                        onSearch={() => {}}
                        instanceId="train-booking-modal"
                        disabled={!!booking}
                    />
                </div>

                {/* Journey Section */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h3 className="text-base font-bold text-primary flex items-center gap-2">
                            <Train className="w-5 h-5 text-blue-500" /> Journey Details
                        </h3>
                        <div className="flex gap-2">
                            <Badge variant="secondary">{details.travelClass}</Badge>
                            <Badge variant="secondary">{details.quota}</Badge>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase opacity-50">Train Information</Label>
                            <TrainSearch
                                trainNumberValue={details.trainNumber}
                                trainNameValue={details.trainName}
                                onSelect={t => setDetails(prev => ({ ...prev, trainNumber: t.trainNumber, trainName: t.trainName, fromStation: t.source || prev.fromStation, toStation: t.destination || prev.toStation }))}
                            />
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <StationSearch value={details.fromStation} onChange={v => setDetails(p => ({ ...p, fromStation: v }))} placeholder="From" />
                            </div>
                            <Button variant="ghost" size="icon" onClick={swapStations} className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground mt-0">
                                <ArrowLeftRight className="w-4 h-4" />
                            </Button>
                            <div className="flex-1">
                                <StationSearch value={details.toStation} onChange={v => setDetails(p => ({ ...p, toStation: v }))} placeholder="To" />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-40">
                                <Input type="date" value={details.journeyDate} onChange={e => setDetails(p => ({ ...p, journeyDate: e.target.value }))} className="h-11 rounded-xl font-semibold" />
                            </div>
                            <div className="flex-1 flex gap-2">
                                <Select value={details.travelClass} onValueChange={v => setDetails(p => ({ ...p, travelClass: v }))}>
                                    <SelectTrigger className="h-11 rounded-xl flex-1 font-semibold"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SL">SL</SelectItem><SelectItem value="3A">3A</SelectItem>
                                        <SelectItem value="2A">2A</SelectItem><SelectItem value="1A">1A</SelectItem>
                                        <SelectItem value="CC">CC</SelectItem><SelectItem value="2S">2S</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={details.quota} onValueChange={v => setDetails(p => ({ ...p, quota: v }))}>
                                    <SelectTrigger className="h-11 rounded-xl flex-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>{QUOTAS.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* IRCTC Section */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-primary flex items-center gap-2 border-b pb-4"><Lock className="w-5 h-5 text-purple-500" /> IRCTC Access</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Input value={details.irctcUser} onChange={e => setDetails(p => ({ ...p, irctcUser: e.target.value }))} placeholder="Username" className="h-11" />
                        <Input type="text" value={details.irctcPass} onChange={e => setDetails(p => ({ ...p, irctcPass: e.target.value }))} placeholder="Password" className="h-11" />
                    </div>
                </div>

                {/* Passengers Section */}
                <div className={cn("bg-card rounded-2xl border p-6 shadow-sm", isLimitExceeded && "border-red-500 bg-red-50/10")}>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-base font-bold flex items-center gap-2"><Users className="w-5 h-5 text-emerald-500" /> Passengers</h3>
                        <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                            setPassengers([{ name: "", age: "", gender: "Male", food: "No Choice", berth: "No Choice", aadhaar: "" }, ...passengers]);
                            setEditingIdx(0);
                        }}>
                            <UserPlus className="w-4 h-4 mr-2" /> Add Passenger
                        </Button>
                    </div>

                    {suggestions.length > 0 && (
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-muted-foreground uppercase mb-2 tracking-widest">Previous Passengers</p>
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                {suggestions.flatMap(b => {
                                    try { return JSON.parse(b.passengersJson || '[]').filter((p, i, self) => i === self.findIndex(t => t.name === p.name)); } catch { return []; }
                                }).slice(0, 10).map((p, idx) => (
                                    <button key={idx} onClick={() => {
                                        const newPassenger = {
                                            name: p.name || "",
                                            age: p.age || "",
                                            gender: p.gender || "Male",
                                            food: p.food || "No Choice",
                                            berth: "No Choice",
                                            aadhaar: p.aadhaar || ""
                                        };
                                        setPassengers(prev => {
                                            const blankIdx = prev.findIndex(p => !p.name && !p.age);
                                            if (blankIdx !== -1) {
                                                const next = [...prev];
                                                next[blankIdx] = newPassenger;
                                                return next;
                                            }
                                            return [newPassenger, ...prev];
                                        });
                                        setEditingIdx(-1); // Show as card
                                    }} className="flex-none px-4 py-2 border-2 rounded-xl text-[11px] font-bold hover:bg-emerald-50 hover:border-emerald-200 transition-all">
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {passengers.map((p, idx) => {
                            const isEditing = editingIdx === idx;
                            return (
                                <div key={idx} className="relative bg-muted/20 border rounded-2xl p-5 pt-8 space-y-4 group transition-all duration-200">
                                    <span className="absolute top-2 left-4 text-[10px] font-black text-emerald-600 uppercase">Passenger #{idx + 1}</span>
                                    
                                    {isEditing ? (
                                        <>
                                            <div className="grid grid-cols-12 gap-3">
                                                <Input className="col-span-6 h-10" placeholder="Name" value={p.name} onChange={e => { const np = [...passengers]; np[idx].name = e.target.value; setPassengers(np); }} />
                                                <Input className="col-span-3 h-10" type="number" placeholder="Age" value={p.age} onChange={e => { const np = [...passengers]; np[idx].age = e.target.value; setPassengers(np); }} />
                                                <Select value={p.gender} onValueChange={v => { const np = [...passengers]; np[idx].gender = v; setPassengers(np); }}>
                                                    <SelectTrigger className="col-span-3 h-10"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-12 gap-3 border-t border-muted/50 pt-3">
                                                <div className="col-span-6 relative">
                                                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" />
                                                    <Input placeholder="Aadhaar (Optional)" value={p.aadhaar} onChange={e => { const np = [...passengers]; np[idx].aadhaar = e.target.value.replace(/\D/g, '').substring(0, 12); setPassengers(np); }} className="h-9 pl-9 text-xs font-mono" />
                                                </div>
                                                <Select value={p.food} onValueChange={v => { const np = [...passengers]; np[idx].food = v; setPassengers(np); }}>
                                                    <SelectTrigger className="col-span-3 h-9 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{FOOD_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <Select value={p.berth} onValueChange={v => { const np = [...passengers]; np[idx].berth = v; setPassengers(np); }}>
                                                    <SelectTrigger className="col-span-3 h-9 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{berthOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <Button variant="outline" size="sm" onClick={() => setEditingIdx(-1)} className="w-full mt-2 h-8 text-[10px] font-bold uppercase tracking-widest border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                                <Check className="w-3 h-3 mr-1" /> Confirm Details
                                            </Button>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-primary">{p.name || "Unnamed Passenger"}</span>
                                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase font-black">{p.age} Yrs • {p.gender[0]}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                                    <span>Berth: {p.berth}</span>
                                                    <span>Food: {p.food}</span>
                                                    {p.aadhaar && <span>UID: {p.aadhaar}</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-full" onClick={() => setEditingIdx(idx)}>
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 rounded-full" onClick={() => setPassengers(passengers.filter((_, i) => i !== idx))} disabled={passengers.length === 1 && !p.name}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Booked By Section */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-bold flex items-center gap-2 border-b pb-4">
                        <Fingerprint className="w-5 h-5 text-amber-500" /> Booking Source
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase opacity-50">Booked By</Label>
                            <Select value={details.bookedBy} onValueChange={v => setDetails(p => ({ ...p, bookedBy: v }))}>
                                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Self">Self</SelectItem>
                                    <SelectItem value="Agent">Agent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Financials Section */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-6">
                    <h3 className="text-base font-bold flex items-center gap-2 border-b pb-4"><CreditCard className="w-5 h-5 text-indigo-500" /> Financials</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase opacity-50">Base Price</Label>
                            <Input type="number" value={details.basePrice} onChange={e => setDetails(p => ({ ...p, basePrice: e.target.value }))} className="h-12 text-lg" placeholder="₹ 0" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase opacity-50">Total Amount</Label>
                            <Input type="number" value={details.amount} onChange={e => setDetails(p => ({ ...p, amount: e.target.value }))} className="h-12 text-lg font-bold bg-primary/5 shadow-inner" placeholder="₹ 0" />
                        </div>
                    </div>
                    <PaymentMode payment={payment} setPayment={setPayment} minAdvance={payment.total} allowCommission={true} hideModes={["Card"]} instanceId="train-payment" />
                </div>

                {/* Contacts Section */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-bold flex items-center gap-2 border-b pb-4"><Phone className="w-5 h-5 text-emerald-500" /> Contacts & Notes</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Input value={details.contactMobile} onChange={e => setDetails(p => ({ ...p, contactMobile: e.target.value }))} placeholder="Mobile" className="h-11" />
                        <Input value={details.contactEmail} onChange={e => setDetails(p => ({ ...p, contactEmail: e.target.value }))} placeholder="Email" className="h-11" />
                    </div>
                    <Textarea value={details.description} onChange={e => setDetails(p => ({ ...p, description: e.target.value }))} placeholder="Notes..." className="h-20" />
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-6 bg-background">
                <Button variant="outline" onClick={onClose} disabled={saving} className="px-8 h-12 rounded-xl">Cancel</Button>
                <Button onClick={handleSave} disabled={saving || isLimitExceeded} className="px-12 h-12 rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 transition-all active:scale-95">
                    {saving ? "Saving..." : (booking ? "Update" : "Confirm")}
                </Button>
            </div>
            
            <SimpleAlert open={alertState.open} onOpenChange={o => setAlertState(p => ({ ...p, open: o }))} title={alertState.title} description={alertState.description} />
        </Modal>
    );
}

function Badge({ children, variant = "default" }) {
    const variants = {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
    };
    return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant])}>{children}</span>;
}
