import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function DoneStatusModal({ isOpen, onClose, onConfirm, totalAmount, defaultProfitType = "Included" }) {
    const [profit, setProfit] = useState("");
    const [finalAmount, setFinalAmount] = useState("");
    const [profitType, setProfitType] = useState(defaultProfitType); // "Included" or "Additional"

    useEffect(() => {
        if (isOpen) {
            setProfit("");
            setFinalAmount(totalAmount.toString());
            setProfitType(defaultProfitType);
        }
    }, [isOpen, totalAmount, defaultProfitType]);

    const handleFinalAmountChange = (val) => {
        setFinalAmount(val);
        const amt = parseFloat(val);
        if (!isNaN(amt)) {
            if (profitType === "Included") {
                setProfit((totalAmount - amt).toFixed(2));
            } else {
                setProfit((amt - totalAmount).toFixed(2));
            }
        } else {
            setProfit("");
        }
    };

    const handleProfitChange = (val, type = profitType) => {
        setProfit(val);
        const p = parseFloat(val);
        if (!isNaN(p)) {
            if (type === "Included") {
                setFinalAmount((totalAmount - p).toFixed(2));
            } else {
                setFinalAmount((totalAmount + p).toFixed(2));
            }
        } else {
            setFinalAmount("");
        }
    };

    const handleTypeChange = (type) => {
        setProfitType(type);
        handleProfitChange(profit, type);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Complete Transaction"
            className="sm:max-w-[400px]"
        >
            <div className="space-y-4 py-2">
                <div className="p-3 bg-muted rounded-md mb-4 text-center relative overflow-hidden">
                    <div className="flex justify-center mb-1">
                        <div className="inline-flex bg-background border rounded-lg p-0.5 shadow-sm">
                            <button
                                onClick={() => handleTypeChange("Included")}
                                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${profitType === "Included" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                Included
                            </button>
                            <button
                                onClick={() => handleTypeChange("Additional")}
                                className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${profitType === "Additional" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                Additional
                            </button>
                        </div>
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider block">Total Amount</span>
                    <span className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</span>
                </div>

                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="profit" className="flex justify-between">
                            <span>Profit / Commission</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                {profitType === "Included" ? "Part of Total" : "On Top of Total"}
                            </span>
                        </Label>
                        <Input
                            id="profit"
                            type="number"
                            value={profit}
                            onChange={(e) => handleProfitChange(e.target.value)}
                            placeholder="0.00"
                            className={`font-bold ${profitType === "Included" ? "text-primary" : "text-emerald-600"}`}
                            autoFocus
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="finalAmount" className="flex justify-between">
                            <span>{profitType === "Included" ? "Final Amount (Cost)" : "Final Amount (Collected)"}</span>
                        </Label>
                        <Input
                            id="finalAmount"
                            type="number"
                            value={finalAmount}
                            onChange={(e) => handleFinalAmountChange(e.target.value)}
                            placeholder="0.00"
                            className="bg-muted/30"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onConfirm(parseFloat(profit) || 0, profitType, parseFloat(finalAmount) || 0)}>Complete</Button>
                </div>
            </div>
        </Modal>
    );
}
