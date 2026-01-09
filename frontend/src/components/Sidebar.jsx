import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Receipt, Users, Settings, Image as ImageIcon, Folder, FileText } from "lucide-react"

export function Sidebar() {
    const location = useLocation()

    const links = [
        { name: "Photo Orders", path: "/photo-orders", icon: ImageIcon },
        { name: "Bill Payment", path: "/bill-payment", icon: Receipt },
        { name: "Customers", path: "/customers", icon: Users },
        { name: "Uploads", path: "/uploads", icon: Folder },
        { name: "Configuration", path: "/configuration", icon: Settings },
        { name: "System Logs", path: "/logs", icon: FileText },
    ]

    return (
        <div className="pb-12 w-64 border-r min-h-screen bg-background">
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Digital Studio
                    </h2>
                    <div className="space-y-1">
                        {links.map((link) => (
                            <Button
                                key={link.path}
                                variant={location.pathname.startsWith(link.path) ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                asChild
                            >
                                <Link to={link.path}>
                                    <link.icon className="mr-2 h-4 w-4" />
                                    {link.name}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
