import { useState } from "react";
import { PageHeader } from "../components/shared/PageHeader";
import { PhotoItemConfig } from "../components/configuration/PhotoItemConfig";
import { AddonConfig } from "../components/configuration/AddonConfig";
import { AddonPricingConfig } from "../components/configuration/AddonPricingConfig";
import { ValueConfig } from "../components/configuration/ValueConfig";
import { configurationService } from "../services/configurationService";
import { Download, Upload } from "lucide-react";
import { Button } from "../components/ui/button";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Configuration() {
    const [activeTab, setActiveTab] = useState("items");

    // Alert State
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "" });
    const showAlert = (title, message) => {
        setAlertConfig({ isOpen: true, title, message });
    };

    const tabs = [
        { id: "items", label: "Photo Items" },
        { id: "addons", label: "Addons" },
        { id: "pricing", label: "Addon Pricing" },
        { id: "values", label: "Values" },
    ];

    const handleExport = async () => {
        try {
            const data = await configurationService.exportFull();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `config_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error(e);
            showAlert("Export Failed", "Failed to export configuration.");
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                await configurationService.importFull(data);
                showAlert("Success", "Configuration Imported Successfully! The page will reload.");
                // Delay reload to let user read
                setTimeout(() => window.location.reload(), 2000);
            } catch (err) {
                console.error(err);
                const msg = err.response?.data || err.message || "Unknown Error";
                showAlert("Import Failed", `Failed to import configuration: ${msg}`);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            <PageHeader title="Configuration">
                <div className="flex items-center gap-4">
                    {/* Tab Switcher */}
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
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                            <Download className="w-4 h-4" />
                            Export
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".json"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleImport}
                            />
                            <Button variant="outline" size="sm" className="gap-2">
                                <Upload className="w-4 h-4" />
                                Import
                            </Button>
                        </div>
                    </div>
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

                    {activeTab === "values" && (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Value Configuration</h2>
                                <p className="text-sm text-muted-foreground">Manage generic key-value settings.</p>
                            </div>
                            <ValueConfig />
                        </div>
                    )}
                </div>
            </div>

            {/* Alert Dialog */}
            <AlertDialog open={alertConfig.isOpen} onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, isOpen: open }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{alertConfig.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {alertConfig.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
