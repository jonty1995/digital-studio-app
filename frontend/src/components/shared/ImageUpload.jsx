
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Upload, X, Link } from "lucide-react"
import { useEffect, useState } from "react"

export function ImageUpload({ image, onUpload, onRemove, photoId }) {
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (!image) {
            setPreviewUrl(null);
            return;
        }

        if (image instanceof File) {
            const url = URL.createObjectURL(image);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(image);
        }
    }, [image]);

    const handleFile = (e) => {
        const file = e.target.files[0];
        if (file) {
            onUpload(file);
        }
    }

    return (
        <div className="w-full p-4 border border-pink-200 rounded-lg bg-pink-50/50 space-y-4">
            <h3 className="font-bold text-pink-900 uppercase text-sm tracking-wide">Photo Upload</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload Box */}
                <div className="relative border-2 border-dashed border-pink-300 rounded-lg bg-white p-6 flex flex-col items-center justify-center text-center space-y-2 hover:bg-pink-50/30 transition-colors cursor-pointer group">
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/png, image/jpeg, image/gif"
                        onChange={handleFile}
                    />
                    <div className="rounded-full bg-pink-100 p-2 text-pink-500 group-hover:bg-pink-200 transition-colors">
                        <Upload className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                            Click to upload <span className="text-pink-600 font-normal">or drag and drop</span>
                        </p>
                        <p className="text-xs text-pink-400">PNG, JPG, GIF up to 10MB</p>
                    </div>
                </div>

                {/* Link ID Section */}
                <div className="flex items-start gap-2">
                    <Input
                        placeholder="Link Existing Photo ID"
                        className="bg-white border-pink-200 focus-visible:ring-pink-500 text-sm"
                    />
                    <Button variant="outline" className="bg-white border-pink-200 hover:bg-pink-50 text-gray-900">
                        Link
                    </Button>
                </div>
            </div>

            {/* Preview Section */}
            {previewUrl && (
                <div className="space-y-2 pt-2">
                    {photoId && (
                        <p className="text-xs font-semibold text-pink-600">Generated Photo ID: {photoId}</p>
                    )}
                    <div className="relative inline-block">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="h-32 w-32 object-cover rounded-lg border border-pink-200 shadow-sm"
                        />
                        <button
                            onClick={onRemove}
                            className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-md hover:bg-red-600 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
