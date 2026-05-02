import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Receipt, Users, Settings, Image as ImageIcon, Folder, FileText, Send, Briefcase, Beaker, ShieldCheck, LogOut, Train } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import { useState } from "react"
import { SimpleAlert } from "./shared/SimpleAlert"
import { useNavigate } from "react-router-dom"

export function Sidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, permissions, logout } = useAuth()
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
    
    console.log("Sidebar rendering, permissions:", permissions);

    const allLinks = [
        { name: "Photo Orders", path: "/photo-orders", icon: ImageIcon },
        { name: "Bill Payment", path: "/bill-payment", icon: Receipt },
        { name: "Money Transfer", path: "/money-transfer", icon: Send },
        { name: "Service", path: "/service-orders", icon: Briefcase },
        { name: "Train", path: "/travel/train", icon: Train },
        { name: "Customers", path: "/customers", icon: Users },
        { name: "Financial Overview", path: "/transactions", icon: LayoutDashboard },
        { name: "Uploads", path: "/uploads", icon: Folder },
        { name: "Lab Photo Process", path: "/lab-photo-process", icon: Beaker },
        { name: "Configuration", path: "/configuration", icon: Settings },
        { name: "System Logs", path: "/logs", icon: FileText },
    ]

    // Filter links based on user permissions
    const visibleLinks = allLinks.filter(link => permissions.includes(link.path))

    return (
        <div className="pb-12 w-64 border-r min-h-screen bg-background flex flex-col justify-between">
            <div className="space-y-4 py-4 flex-grow overflow-y-auto scrollbar-thin">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Digital Studio
                    </h2>
                    <div className="space-y-1">
                        {allLinks.map((link) => {
                            const hasPermission = useAuth().hasPermission(link.path);
                            return (
                                <Button
                                    key={link.path}
                                    variant={location.pathname.startsWith(link.path) ? "secondary" : "ghost"}
                                    className={cn(
                                        "w-full justify-start relative group",
                                        !hasPermission && "opacity-50 cursor-not-allowed grayscale"
                                    )}
                                    disabled={!hasPermission}
                                    asChild={hasPermission}
                                >
                                    {hasPermission ? (
                                        <Link to={link.path}>
                                            <link.icon className="mr-2 h-4 w-4" />
                                            {link.name}
                                        </Link>
                                    ) : (
                                        <div className="flex items-center w-full">
                                            <link.icon className="mr-2 h-4 w-4" />
                                            <span>{link.name}</span>
                                            <span className="ml-auto text-[8px] font-bold uppercase text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                Denied
                                            </span>
                                        </div>
                                    )}
                                </Button>
                            );
                        })}
                    </div>

                    {user?.role === "ADMIN" && (
                        <div className="mt-8 pt-4 border-t border-slate-800">
                             <Button
                                variant={location.pathname === "/admin/permissions" ? "secondary" : "ghost"}
                                className="w-full justify-start text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                                asChild
                            >
                                <Link to="/admin/permissions">
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Admin UI
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="px-5 py-4 border-t border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-primary border border-slate-700">
                        {user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <div className="text-sm font-medium">{user?.username}</div>
                        <div className="text-xs text-slate-500">{user?.role}</div>
                    </div>
                </div>
                 <Button 
                    variant="destructive" 
                    className="w-full justify-start bg-red-900/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 border-none" 
                    onClick={() => setIsLogoutModalOpen(true)}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                </Button>
            </div>

            <SimpleAlert
                open={isLogoutModalOpen}
                onOpenChange={setIsLogoutModalOpen}
                title="Confirm Logout"
                description="Are you sure you want to sign out of Digital Studio?"
                onConfirm={() => {
                    logout();
                    navigate("/login");
                }}
                confirmText="Sign Out"
                cancelText="Cancel"
            />
        </div>
    )
}
