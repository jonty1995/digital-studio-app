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

export function SimpleAlert({ open, onOpenChange, title, description, confirmText = "OK", onConfirm, cancelText = "Cancel" }) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    {onConfirm && <AlertDialogCancel onClick={() => onOpenChange(false)}>{cancelText}</AlertDialogCancel>}
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
