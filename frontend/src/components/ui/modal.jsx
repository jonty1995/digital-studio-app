import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export function Modal({ isOpen, onClose, title, children, className }) {
    const overlayRef = useRef(null);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === "Escape") onClose();
        };

        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            ref={overlayRef}
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            <div
                className={cn(
                    "relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-lg animate-in zoom-in-95 duration-200",
                    className
                )}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>,
        document.body
    );
}
