import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Image as ImageIcon } from "lucide-react"

export function ImageUpload({ onUpload }) {
    const handleFile = (e) => {
        const file = e.target.files[0]
        if (file) onUpload(file)
    }

    return (
        <div className="grid w-full max-w-sm items-center gap-1.5 p-4 border rounded-md bg-card">
            <Label htmlFor="picture">Picture</Label>
            <div className="flex items-center gap-2">
                <Input id="picture" type="file" accept="image/*" onChange={handleFile} />
                <Button variant="outline" size="icon">
                    <ImageIcon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
