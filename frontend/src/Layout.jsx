import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"

export default function Layout() {
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-y-auto bg-muted/20">
                <Outlet />
            </main>
        </div>
    )
}
