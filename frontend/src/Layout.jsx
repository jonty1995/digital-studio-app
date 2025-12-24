import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"

export default function Layout() {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 p-8 bg-muted/20">
                <Outlet />
            </div>
        </div>
    )
}
