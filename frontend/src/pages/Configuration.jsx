import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { PageHeader } from "../components/shared/PageHeader";
import { PhotoItemConfig } from "../components/configuration/PhotoItemConfig";
import { AddonConfig } from "../components/configuration/AddonConfig";
import { AddonPricingConfig } from "../components/configuration/AddonPricingConfig";
import { ServiceConfig } from "../components/configuration/ServiceConfig";
import { AccountConfig } from "../components/configuration/AccountConfig";
import { ValueConfig } from "../components/configuration/ValueConfig";
import { AuditLogs } from "../components/configuration/AuditLogs";
import { configurationService } from "../services/configurationService";
import { DateUtils } from "../utils/DateUtils";
import { Download, Upload } from "lucide-react";

import { Button } from "../components/ui/button";
import { SimpleAlert } from "../components/shared/SimpleAlert";

export default function Configuration() {
    const { hasPermission } = useAuth();

    // Alert State
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: "", message: "" });
    const showAlert = (title, message) => {
        setAlertConfig({ isOpen: true, title, message });
    };
    const tabs = [
        { id: "items", label: "Photo Items", path: "/configuration/items" },
        { id: "addons", label: "Addons", path: "/configuration/addons" },
        { id: "pricing", label: "Addon Pricing", path: "/configuration/pricing" },
        { id: "services", label: "Services", path: "/configuration/services" },
        { id: "accounts", label: "Account Management", path: "/configuration/accounts" },
        { id: "values", label: "Values", path: "/configuration/values" },
        { id: "audit", label: "Audit Trail", path: "/configuration/audit" },
    ].filter(tab => hasPermission(tab.path, "access"));

    const [activeTab, setActiveTab] = useState(() => {
        return tabs.length > 0 ? tabs[0].id : "items";
    });

    // If active tab becomes unauthorized, switch to the first available one
    useEffect(() => {
        if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
            setActiveTab(tabs[0].id);
        }
    }, [tabs, activeTab]);

    const handleExport = async () => {
        try {
            const data = await configurationService.exportFull();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `config_backup_${DateUtils.formatForInput(new Date())}.json`;
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
                let msg = err.message || "Unknown Error";
                if (err.response?.data) {
                    if (typeof err.response.data === 'string') {
                        msg = err.response.data;
                    } else {
                        msg = err.response.data.error || err.response.data.message || JSON.stringify(err.response.data);
                    }
                }
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
                            <Upload className="w-4 h-4" />
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
                                <Download className="w-4 h-4" />
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
                            <PhotoItemConfig 
                                showAlert={showAlert} 
                                canAdd={hasPermission('/configuration/items', 'add')}
                                canEdit={hasPermission('/configuration/items', 'edit')}
                                canDelete={hasPermission('/configuration/items', 'delete')}
                            />
                        </div>
                    )}

                    {activeTab === "addons" && (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Addons Management</h2>
                                <p className="text-sm text-muted-foreground">Define available addons like frames, lamination, etc.</p>
                            </div>
                            <AddonConfig 
                                showAlert={showAlert} 
                                canAdd={hasPermission('/configuration/addons', 'add')}
                                canEdit={hasPermission('/configuration/addons', 'edit')}
                                canDelete={hasPermission('/configuration/addons', 'delete')}
                            />
                        </div>
                    )}

                    {activeTab === "pricing" && (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Addon Pricing Configuration</h2>
                                <p className="text-sm text-muted-foreground">Set prices for specific combinations of Photo Items and Addons.</p>
                            </div>
                            <AddonPricingConfig 
                                showAlert={showAlert} 
                                canAdd={hasPermission('/configuration/pricing', 'add')}
                                canEdit={hasPermission('/configuration/pricing', 'edit')}
                                canDelete={hasPermission('/configuration/pricing', 'delete')}
                            />
                        </div>
                    )}

                    {activeTab === "services" && (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Services Management</h2>
                                <p className="text-sm text-muted-foreground">Define available services and their default costs.</p>
                            </div>
                            <ServiceConfig 
                                showAlert={showAlert} 
                                canAdd={hasPermission('/configuration/services', 'add')}
                                canEdit={hasPermission('/configuration/services', 'edit')}
                                canDelete={hasPermission('/configuration/services', 'delete')}
                            />
                        </div>
                    )}

                    {activeTab === "accounts" && (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Account Management</h2>
                                <p className="text-sm text-muted-foreground">Manage your bank accounts, cash in hand, and credit cards.</p>
                            </div>
                            <AccountConfig 
                                showAlert={showAlert} 
                                canAdd={hasPermission('/configuration/accounts', 'add')}
                                canEdit={hasPermission('/configuration/accounts', 'edit')}
                                canDelete={hasPermission('/configuration/accounts', 'delete')}
                            />
                        </div>
                    )}

                    {activeTab === "values" && (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Value Configuration</h2>
                                <p className="text-sm text-muted-foreground">Manage generic key-value settings.</p>
                            </div>
                            <ValueConfig 
                                showAlert={showAlert} 
                                canAdd={hasPermission('/configuration/values', 'add')}
                                canEdit={hasPermission('/configuration/values', 'edit')}
                                canDelete={hasPermission('/configuration/values', 'delete')}
                            />
                        </div>
                    )}

                    {activeTab === "audit" && (
                        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold">Configuration Audit Trail</h2>
                                <p className="text-sm text-muted-foreground">View change history for all configuration items.</p>
                            </div>
                            <AuditLogs />
                        </div>
                    )}
                </div>
            </div>

            {/* Alert Dialog */}
            <SimpleAlert
                open={alertConfig.isOpen}
                onOpenChange={(open) => setAlertConfig(prev => ({ ...prev, isOpen: open }))}
                title={alertConfig.title}
                description={alertConfig.message}
            />
        </div>
    );
}
