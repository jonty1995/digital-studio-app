import { useState } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { PhotoItemConfig } from "../components/configuration/PhotoItemConfig";
import { AddonConfig } from "../components/configuration/AddonConfig";
import { AddonPricingConfig } from "../components/configuration/AddonPricingConfig";

export default function Configuration() {
    const [activeTab, setActiveTab] = useState("items");

    const tabs = [
        { id: "items", label: "Photo Items" },
        { id: "addons", label: "Addons" },
        { id: "pricing", label: "Addon Pricing" },
    ];

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <PageHeader title="Configuration">
                {/* Simple Tab Switcher */}
                <div className="flex p-1 bg-muted rounded-lg w-fit">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === tab.id
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </PageHeader>

            <div className="p-6 flex-1 overflow-auto">
                <div className="max-w-5xl mx-auto space-y-6">
                    {activeTab === "items" && (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Photo Items Management</h2>
                                <p className="text-sm text-muted-foreground">Configure base items and their standard rates.</p>
                            </div>
                            <PhotoItemConfig />
                        </div>
                    )}

                    {activeTab === "addons" && (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Addons Management</h2>
                                <p className="text-sm text-muted-foreground">Define available addons like frames, lamination, etc.</p>
                            </div>
                            <AddonConfig />
                        </div>
                    )}

                    {activeTab === "pricing" && (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Addon Pricing Configuration</h2>
                                <p className="text-sm text-muted-foreground">Set prices for specific combinations of Photo Items and Addons.</p>
                            </div>
                            <AddonPricingConfig />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
