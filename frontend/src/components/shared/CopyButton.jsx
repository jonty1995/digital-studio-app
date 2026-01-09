import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text, className, iconClass = "", title = "Copy" }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className={className}
            onClick={handleCopy}
            title={title}
        >
            {copied ? <Check className={`h-3 w-3 text-green-500 animate-in zoom-in duration-300 ${iconClass}`} /> : <Copy className={`h-3 w-3 ${iconClass}`} />}
        </Button>
    );
}
