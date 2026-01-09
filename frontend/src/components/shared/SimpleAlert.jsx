import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function SimpleAlert({ open, onOpenChange, title, description, confirmText = "OK", onConfirm, cancelText = "Cancel", type = "alert", inputValue, onInputChange, placeholder = "Enter value..." }) {
    const isPrompt = type === "prompt";
    const showCancel = type === "confirm" || type === "prompt" || onConfirm;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                    {isPrompt && (
                        <div className="pt-2">
                            <input
                                type="text"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={inputValue || ""}
                                onChange={(e) => onInputChange && onInputChange(e.target.value)}
                                placeholder={placeholder}
                                autoFocus
                            />
                        </div>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    {showCancel && <AlertDialogCancel onClick={() => onOpenChange(false)}>{cancelText}</AlertDialogCancel>}
                    <AlertDialogAction onClick={() => {
                        if (onConfirm) onConfirm();
                        else onOpenChange(false);
                    }}>
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
