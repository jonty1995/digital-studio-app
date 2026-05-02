// Refined Train Booking Modal - Updated with Fixed Datepicker and Suggestions
import { useState, useEffect, useMemo, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CustomerInfo } from "./CustomerInfo";
import { PaymentMode } from "./PaymentMode";
import { customerService } from "@/services/customerService";
import { trainBookingService } from "@/services/trainBookingService";
import { SimpleAlert } from "@/components/shared/SimpleAlert";
import { StationSearch } from "./StationSearch";
import { TrainSearch } from "./TrainSearch";
import { DateUtils } from "@/utils/DateUtils";
import { UserPlus, Trash2, Users, AlertCircle, Split, ChevronLeft, ChevronRight, CheckCircle2, Train, Info, CreditCard, Lock, Mail, Phone, Calendar as CalendarIcon } from "lucide-react";
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
    const [customer, setCustomer] = useState({ mobile: '', name: '', id: '' });
    const [details, setDetails] = useState({
        trainNumber: "",
        trainName: "",
        pnr: "",
        fromStation: "",
        toStation: "",
        journeyDate: new Date().toISOString().split('T')[0],
        travelClass: "SL",
        quota: "GN",
        amount: "",
        basePrice: "",
        description: "",
        irctcUser: "",
        irctcPass: "",
        contactMobile: "",
        contactEmail: ""
    });

    const [passengers, setPassengers] = useState([
        { name: "", age: "", gender: "Male", food: "No Choice", berth: "No Choice" }
    ]);

    const [payment, setPayment] = useState({ mode: 'Cash', total: 0, discount: 0, advance: 0, commission: 0 });
    const [alertState, setAlertState] = useState({ open: false, title: "", description: "" });
    const [saving, setSaving] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    const showAlert = (title, description) => {
        setAlertState({ open: true, title, description });
    };

    const quotaInfo = useMemo(() => QUOTAS.find(q => q.value === details.quota), [details.quota]);
    const isLimitExceeded = passengers.length > (quotaInfo?.max || 6);

    const berthOptions = useMemo(() => {
        const isSleeper = ["SL", "3A", "2A", "1A"].includes(details.travelClass);
        const isChair = ["CC", "2S"].includes(details.travelClass);
        if (isSleeper) return ["No Choice", "Lower", "Middle", "Upper", "Side Lower", "Side Upper"];
        if (isChair) return ["No Choice", "Window", "Aisle"];
        return ["No Choice"];
    }, [details.travelClass]);

    useEffect(() => {
        if (!isOpen) {
            setCustomer({ mobile: '', name: '', id: '' });
            setDetails({
                trainNumber: "",
                trainName: "",
                pnr: "",
                fromStation: "",
                toStation: "",
                journeyDate: new Date().toISOString().split('T')[0],
                travelClass: "SL",
                quota: "GN",
                amount: "",
                basePrice: "",
                description: "",
                irctcUser: "",
                irctcPass: "",
                contactMobile: "",
                contactEmail: ""
            });
            setPassengers([{ name: "", age: "", gender: "Male", food: "No Choice", berth: "No Choice" }]);
            setPayment({ mode: 'Cash', total: 0, discount: 0, advance: 0, commission: 0 });
            setSuggestions([]);
        } else if (booking) {
            setCustomer({
                mobile: booking.customer?.mobile || '',
                name: booking.customer?.name || '',
                id: booking.customer?.id || ''
            });
            setDetails({
                trainNumber: booking.trainNumber || '',
                trainName: booking.trainName || '',
                pnr: booking.pnr || '',
                fromStation: booking.fromStation || '',
                toStation: booking.toStation || '',
                journeyDate: booking.journeyDate ? booking.journeyDate.substring(0, 10) : '',
                travelClass: booking.travelClass || 'SL',
                quota: booking.quota || 'GN',
                amount: booking.amount?.toString() || '',
                basePrice: booking.basePrice?.toString() || '',
                description: booking.description || '',
                irctcUser: booking.irctcUser || '',
                irctcPass: booking.irctcPass || '',
                contactMobile: booking.contactMobile || booking.customer?.mobile || '',
                contactEmail: booking.contactEmail || ''
            });
            if (booking.passengersJson) {
                try { setPassengers(JSON.parse(booking.passengersJson)); } catch (e) {
                    setPassengers([{ name: "", age: "", gender: "Male", food: "No Choice", berth: "No Choice" }]);
                }
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
    }, [isOpen, booking]);

    // Fetch suggestions when customer mobile is selected
    useEffect(() => {
        const fetchSuggestions = async () => {
            // Check for EXACT mobile match from CustomerInfo
            if (customer.mobile && customer.mobile.length >= 10 && !booking) {
                try {
                    const data = await trainBookingService.getSuggestions(customer.mobile);
                    setSuggestions(data || []);
                } catch (err) {
                    console.error("Failed to load suggestions", err);
                }
            } else {
                setSuggestions([]);
            }
        };
        const timeoutId = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeoutId);
    }, [customer.mobile, booking]);

    useEffect(() => {
        const amt = parseFloat(details.amount) || 0;
        setPayment(prev => ({ ...prev, total: amt, advance: amt }));
    }, [details.amount]);

    useEffect(() => {
        // Automatically sync contact mobile with customer mobile
        setDetails(prev => {
            if (!prev.contactMobile || prev.contactMobile === prev._lastSyncedMobile) {
                return { ...prev, contactMobile: customer.mobile, _lastSyncedMobile: customer.mobile };
            }
            return prev;
        });
    }, [customer.mobile]);

    const handleSearchCustomer = async () => {
        if (!customer.mobile) return;
        try {
            const found = await customerService.search(customer.mobile);
            if (found) {
                setCustomer(prev => ({ ...prev, name: found.name || '', id: found.id || prev.mobile }));
            }
        } catch (error) { }
    };

    const addPassenger = () => {
        const lastP = passengers[0];
        if (lastP && (!lastP.name || !lastP.age)) {
            return showAlert("Incomplete Passenger", "Please fill the top passenger's details before adding another.");
        }
        setPassengers([{ name: "", age: "", gender: "Male", food: "No Choice", berth: "No Choice" }, ...passengers]);
    };

    const removePassenger = (index) => {
        if (passengers.length === 1) {
            setPassengers([{ name: "", age: "", gender: "Male", food: "No Choice", berth: "No Choice" }]);
            return;
        }
        setPassengers(passengers.filter((_, i) => i !== index));
    };

    const updatePassenger = (index, field, value) => {
        const newPassengers = [...passengers];
        newPassengers[index][field] = value;
        setPassengers(newPassengers);
    };

    const handleApplyPassengerSuggestion = (p) => {
        // Check if top row is empty
        const topRow = passengers[0];
        if (!topRow.name && !topRow.age) {
            updatePassenger(0, 'name', p.name);
            updatePassenger(0, 'age', p.age);
            updatePassenger(0, 'gender', p.gender || "Male");
            updatePassenger(0, 'food', p.food || "No Choice");
            updatePassenger(0, 'berth', p.berth || "No Choice");
        } else {
            // Check if already in list
            if (passengers.find(row => row.name === p.name)) return;
            
            setPassengers([{ 
                name: p.name, 
                age: p.age, 
                gender: p.gender || "Male", 
                food: p.food || "No Choice", 
                berth: p.berth || "No Choice" 
            }, ...passengers]);
        }
    };

    const handleSplitBooking = () => {
        const limit = quotaInfo?.max || 6;
        if (passengers.length <= limit) return;
        const firstBatch = passengers.slice(0, limit);
        showAlert("Split Initiated", `Booking split at ${limit} passengers.`);
        setPassengers(firstBatch);
    };

    const handleSave = async () => {
        if (!customer.name) return showAlert("Missing Customer", "Customer Name is required.");
        if (!details.amount) return showAlert("Missing Amount", "Amount is required.");
        if (!details.contactMobile) return showAlert("Missing Mobile", "Contact Mobile is required.");
        if (isLimitExceeded) return showAlert("Limit Exceeded", `Max ${quotaInfo.max} allowed for ${quotaInfo.label}.`);
        const invalid = passengers.find(p => !p.name || !p.age);
        if (invalid) return showAlert("Invalid Passengers", "Please fill name and age for all passengers.");

        setSaving(true);
        try {
            const payload = {
                customer: { id: customer.id && customer.id.toString().length > 5 ? customer.id : null, name: customer.name, mobile: customer.mobile },
                trainNumber: details.trainNumber,
                trainName: details.trainName,
                pnr: details.pnr,
                fromStation: details.fromStation,
                toStation: details.toStation,
                journeyDate: details.journeyDate ? details.journeyDate + "T00:00:00" : null,
                travelClass: details.travelClass,
                quota: details.quota,
                passengersJson: JSON.stringify(passengers),
                amount: parseFloat(details.amount),
                basePrice: parseFloat(details.basePrice) || 0,
                description: details.description,
                status: booking ? booking.status : "Pending",
                irctcUser: details.irctcUser,
                irctcPass: details.irctcPass,
                contactMobile: details.contactMobile,
                contactEmail: details.contactEmail,
                payment: {
                    paymentMode: payment.mode,
                    totalAmount: parseFloat(payment.total) || 0,
                    advanceAmount: parseFloat(payment.advance) || 0,
                    discountAmount: parseFloat(payment.discount) || 0,
                    commission: parseFloat(payment.commission) || 0,
                    dueAmount: (parseFloat(payment.total) || 0) - (parseFloat(payment.advance) || 0) - (parseFloat(payment.discount) || 0)
                }
            };
            await onSave(payload, booking?.id);
            onClose();
        } catch (error) {
            console.error(error);
            showAlert("Error", "Failed to save train booking.");
        } finally { setSaving(false); }
    };

    const renderPassengerSuggestions = () => {
        if (suggestions.length === 0) return null;
        
        const allPrevPassengers = [];
        suggestions.forEach(b => {
            if (b.passengersJson) {
                try {
                    const ps = JSON.parse(b.passengersJson);
                    ps.forEach(p => {
                        if (p.name && !allPrevPassengers.find(existing => existing.name === p.name)) {
                            allPrevPassengers.push(p);
                        }
                    });
                } catch(e){}
            }
        });

        if (allPrevPassengers.length === 0) return null;

        const scrollContainerRef = useRef(null);
        const scroll = (direction) => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollBy({
                    left: direction === 'left' ? -200 : 200,
                    behavior: 'smooth'
                });
            }
        };

        return (
            <div className="w-full mb-6">
                <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-3 block">Previous Passengers</Label>
                <div className="relative group/psuggest">
                    <button
                        type="button"
                        onClick={() => scroll('left')}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-background border rounded-full p-1.5 shadow-md opacity-0 group-hover/psuggest:opacity-100 transition-opacity"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <div
                        ref={scrollContainerRef}
                        className="flex gap-3 overflow-x-auto scrollbar-hide py-1 px-1 scroll-smooth"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {allPrevPassengers.map((p, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleApplyPassengerSuggestion(p)}
                                className="flex-none w-[140px] text-[11px] border-2 rounded-xl p-3 bg-card hover:bg-emerald-50 hover:border-emerald-500/40 transition-all text-left flex flex-col gap-1 shadow-sm relative overflow-hidden group/pitem"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-50" />
                                <span className="font-bold text-primary truncate" title={p.name}>{p.name}</span>
                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span>{p.age}Y</span>
                                    <span>•</span>
                                    <span>{p.gender?.charAt(0)}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => scroll('right')}
                        className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-background border rounded-full p-1.5 shadow-md opacity-0 group-hover/psuggest:opacity-100 transition-opacity"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={booking ? "Edit Train Booking" : "New Train Booking"}
            className="sm:max-w-[750px]"
            preventOutsideClose={true}>
            <div className="flex flex-col gap-8 max-h-[85vh] overflow-y-auto pr-3 custom-scrollbar px-1 pb-6">
                
                {/* 0. Customer Info */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm">
                    <CustomerInfo
                        customer={customer}
                        setCustomer={setCustomer}
                        onSearch={handleSearchCustomer}
                        instanceId="train-booking-modal"
                        disabled={!!booking}
                    />
                </div>

                {/* 1. Journey Details */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b pb-4">
                        <h3 className="text-base font-bold text-primary flex items-center gap-2">
                            <Train className="w-5 h-5 text-blue-500" /> Journey Details
                        </h3>
                        <Badge variant="outline" className="text-[10px] px-3 py-1">{details.travelClass} • {details.quota}</Badge>
                    </div>
                    
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">Search Train</Label>
                            <TrainSearch
                                trainNumberValue={details.trainNumber}
                                trainNameValue={details.trainName}
                                onSelect={train => setDetails({ 
                                    ...details, 
                                    trainNumber: train.trainNumber, 
                                    trainName: train.trainName,
                                    fromStation: train.source || details.fromStation,
                                    toStation: train.destination || details.toStation
                                })}
                                placeholder="Enter Train Number or Name"
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">From Station</Label>
                                <StationSearch
                                    value={details.fromStation}
                                    onChange={val => setDetails({ ...details, fromStation: val })}
                                    placeholder="Source"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">To Station</Label>
                                <StationSearch
                                    value={details.toStation}
                                    onChange={val => setDetails({ ...details, toStation: val })}
                                    placeholder="Destination"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">Journey Date</Label>
                                <div className="relative">
                                    <Input
                                        type="date"
                                        value={details.journeyDate}
                                        onChange={e => setDetails({ ...details, journeyDate: e.target.value })}
                                        className={cn(
                                            "h-11 rounded-xl border-2 focus:border-primary/50 pl-11",
                                            "appearance-none bg-transparent relative z-10",
                                            "flex items-center"
                                        )}
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-0">
                                        <CalendarIcon className="w-4 h-4" />
                                    </div>
                                    {/* Display overlay for custom format if possible, but native input is safer for cross-browser */}
                                </div>
                                <p className="text-[10px] text-muted-foreground font-medium pl-1">
                                    Selected: {DateUtils.formatDate(details.journeyDate)}
                                </p>
                            </div>
                            {booking && (
                                <div className="space-y-2">
                                    <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">PNR Number</Label>
                                    <Input
                                        value={details.pnr}
                                        onChange={e => setDetails({ ...details, pnr: e.target.value.toUpperCase() })}
                                        placeholder="PNR"
                                        maxLength={10}
                                        className="h-11 rounded-xl border-2 focus:border-primary/50"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">Travel Class</Label>
                                <Select
                                    value={details.travelClass}
                                    onValueChange={val => setDetails({ ...details, travelClass: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-2"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SL">Sleeper (SL)</SelectItem>
                                        <SelectItem value="3A">3rd AC (3A)</SelectItem>
                                        <SelectItem value="2A">2nd AC (2A)</SelectItem>
                                        <SelectItem value="1A">1st AC (1A)</SelectItem>
                                        <SelectItem value="CC">Chair Car (CC)</SelectItem>
                                        <SelectItem value="2S">2nd Sitting (2S)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">Quota Type</Label>
                                <Select
                                    value={details.quota}
                                    onValueChange={val => setDetails({ ...details, quota: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-2"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {QUOTAS.map(q => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 1.1 IRCTC Credentials */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-5">
                    <h3 className="text-base font-bold text-primary flex items-center gap-2 border-b pb-4 mb-2">
                        <Lock className="w-5 h-5 text-purple-500" /> IRCTC Credentials <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">Username</Label>
                            <Input
                                value={details.irctcUser}
                                onChange={e => setDetails({ ...details, irctcUser: e.target.value })}
                                placeholder="IRCTC User ID"
                                className="h-11 rounded-xl border-2"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">Password</Label>
                            <Input
                                type="password"
                                value={details.irctcPass}
                                onChange={e => setDetails({ ...details, irctcPass: e.target.value })}
                                placeholder="IRCTC Password"
                                className="h-11 rounded-xl border-2"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Passenger Details */}
                <div className={cn(
                    "bg-card rounded-2xl border p-6 shadow-sm transition-all duration-300",
                    isLimitExceeded ? "border-red-500 bg-red-50/20" : ""
                )}>
                    <div className="flex items-center justify-between border-b pb-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                                <Users className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-primary">Passenger Details</h3>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Max {quotaInfo?.max} for {details.quota}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {isLimitExceeded && (
                                <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    className="h-9 gap-2 shadow-sm animate-pulse rounded-lg"
                                    onClick={handleSplitBooking}
                                >
                                    <Split className="w-4 h-4" /> Split
                                </Button>
                            )}
                            <Button 
                                variant="default" 
                                size="sm" 
                                className="h-9 gap-2 shadow-lg bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all" 
                                onClick={addPassenger}
                            >
                                <UserPlus className="w-4 h-4" /> Add
                            </Button>
                        </div>
                    </div>

                    {renderPassengerSuggestions()}

                    <div className="space-y-6">
                        {passengers.map((p, idx) => (
                            <div key={idx} className="relative group bg-muted/30 border border-muted/60 rounded-2xl p-5 pt-8 space-y-5 hover:border-emerald-500/30 hover:bg-muted/40 transition-all shadow-sm">
                                <div className="absolute -top-3 left-6 flex items-center gap-2">
                                    <span className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[12px] font-black shadow-md">
                                        {idx + 1}
                                    </span>
                                    {p.name && p.age && (
                                        <span className="h-6 px-3 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> READY
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                                    <div className="sm:col-span-7 space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Full Name</Label>
                                        <Input 
                                            placeholder="Passenger Name" 
                                            value={p.name} 
                                            onChange={e => updatePassenger(idx, 'name', e.target.value)}
                                            className="h-10 rounded-xl bg-background border-2"
                                        />
                                    </div>
                                    <div className="sm:col-span-2 space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Age</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="00" 
                                            value={p.age} 
                                            onChange={e => updatePassenger(idx, 'age', e.target.value)}
                                            className="h-10 rounded-xl bg-background border-2"
                                        />
                                    </div>
                                    <div className="sm:col-span-3 space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Gender</Label>
                                        <Select value={p.gender} onValueChange={v => updatePassenger(idx, 'gender', v)}>
                                            <SelectTrigger className="h-10 rounded-xl bg-background border-2 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {GENDERS.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-muted/80 pt-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Food Choice</Label>
                                        <Select value={p.food} onValueChange={v => updatePassenger(idx, 'food', v)}>
                                            <SelectTrigger className="h-10 rounded-xl bg-background border-2 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {FOOD_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Berth Option</Label>
                                        <Select value={p.berth} onValueChange={v => updatePassenger(idx, 'berth', v)}>
                                            <SelectTrigger className="h-10 rounded-xl bg-background border-2 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {berthOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-full"
                                        onClick={() => removePassenger(idx)}
                                        disabled={passengers.length === 1 && !p.name}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {isLimitExceeded && (
                        <div className="mt-8 p-5 bg-red-100/50 border-2 border-red-200 rounded-2xl text-xs text-red-800 font-bold flex items-center gap-4 shadow-sm">
                            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                            <div>
                                <p className="text-sm">Passenger Limit Exceeded!</p>
                                <p className="font-medium opacity-80 mt-0.5">Maximum {quotaInfo.max} allowed for {quotaInfo.label}.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2.1 Contact Details */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-5">
                    <h3 className="text-base font-bold text-primary flex items-center gap-2 border-b pb-4 mb-2">
                        <Phone className="w-5 h-5 text-emerald-500" /> Contact Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">Mobile Number</Label>
                            <Input
                                value={details.contactMobile}
                                onChange={e => setDetails({ ...details, contactMobile: e.target.value })}
                                placeholder="Passenger Mobile"
                                className="h-11 rounded-xl border-2"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">Email ID <span className="font-normal text-[9px]">(Optional)</span></Label>
                            <Input
                                value={details.contactEmail}
                                onChange={e => setDetails({ ...details, contactEmail: e.target.value })}
                                placeholder="Passenger Email"
                                className="h-11 rounded-xl border-2"
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Additional Notes */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-primary flex items-center gap-2 border-b pb-4 mb-2">
                        <Info className="w-5 h-5 text-orange-500" /> Additional Notes
                    </h3>
                    <Textarea
                        value={details.description}
                        onChange={e => setDetails({ ...details, description: e.target.value })}
                        placeholder="Any special instructions or preferences..."
                        className="h-24 text-sm rounded-xl border-2 bg-muted/10"
                    />
                </div>

                {/* 4. Financials */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-6">
                    <h3 className="text-base font-bold text-primary flex items-center gap-2 border-b pb-4 mb-2">
                        <CreditCard className="w-5 h-5 text-indigo-500" /> Financial Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">Base Ticket Price</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                                <Input
                                    type="number"
                                    value={details.basePrice}
                                    onChange={e => setDetails({ ...details, basePrice: e.target.value })}
                                    className="h-12 pl-8 rounded-xl border-2 font-medium"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] uppercase text-muted-foreground font-black tracking-widest">Total Charged Amount</Label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                                <Input
                                    type="number"
                                    value={details.amount}
                                    onChange={e => setDetails({ ...details, amount: e.target.value })}
                                    className="h-12 pl-8 rounded-xl border-2 font-bold text-lg text-primary bg-primary/5 border-primary/20"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Payment Details */}
                <div className="bg-card rounded-2xl border p-6 shadow-sm">
                    <PaymentMode
                        payment={payment}
                        setPayment={setPayment}
                        minAdvance={payment.total}
                        allowCommission={true}
                        hideModes={["Card"]}
                        instanceId="train-payment"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-4 border-t pt-6 bg-background">
                <Button variant="outline" onClick={onClose} disabled={saving} className="px-8 h-12 rounded-xl text-sm font-bold border-2">Cancel</Button>
                <Button 
                    onClick={handleSave} 
                    disabled={saving || isLimitExceeded}
                    className="px-10 h-12 font-black rounded-xl shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all text-sm uppercase tracking-widest"
                >
                    {saving ? "Processing..." : (booking ? "Update Booking" : "Confirm Booking")}
                    {!saving && <ChevronRight className="w-5 h-5 ml-2" />}
                </Button>
            </div>

            <SimpleAlert
                open={alertState.open}
                onOpenChange={(open) => setAlertState(prev => ({ ...prev, open }))}
                title={alertState.title}
                description={alertState.description}
            />
        </Modal >
    );
}

function Badge({ children, variant = "default", className }) {
    const variants = {
        default: "bg-primary text-primary-foreground",
        outline: "border-2 border-muted text-muted-foreground",
        secondary: "bg-muted text-muted-foreground"
    };
    return (
        <span className={cn("px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider", variants[variant], className)}>
            {children}
        </span>
    );
}
