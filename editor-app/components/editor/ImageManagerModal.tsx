"use client";

import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";

export interface ImageInfo {
    name: string;
    path: string;
    download_url: string;
    url: string;
}

interface ImageManagerModalProps {
    mode: "insert" | "thumbnail";
    images: ImageInfo[];
    isUploading: boolean;
    onClose: () => void;
    onSelectImage: (image: ImageInfo) => void;
    onUploadFile: (file: File) => Promise<void>;
}

export function ImageManagerModal({
    mode,
    images,
    isUploading,
    onClose,
    onSelectImage,
    onUploadFile,
}: ImageManagerModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            role="presentation"
            onClick={onClose}
        >
            <div
                className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-label="Image Manager"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">
                        Image Manager ({mode === "insert" ? "Insert to Content" : "Select Thumbnail"})
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl" aria-label="Close">
                        &times;
                    </button>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Upload New Image</label>
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            accept="image/*"
                            disabled={isUploading}
                            onChange={async (e) => {
                                if (e.target.files?.[0]) {
                                    const file = e.target.files[0];
                                    e.target.value = "";
                                    await onUploadFile(file);
                                }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                        />
                        {isUploading && (
                            <span className="flex items-center gap-1 text-sm text-gray-500 shrink-0">
                                <Loader2 size={16} className="animate-spin" />
                                Uploading...
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-4 p-2 border rounded">
                    {images.map((img) => (
                        <div
                            key={img.path}
                            className="border rounded p-2 hover:bg-blue-50 cursor-pointer flex flex-col items-center"
                            onClick={() => onSelectImage(img)}
                        >
                            <div className="h-32 w-full flex items-center justify-center bg-gray-100 mb-2 overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.download_url} alt={img.name} className="max-h-full max-w-full object-contain" />
                            </div>
                            <p className="text-xs text-center truncate w-full" title={img.name}>
                                {img.name}
                            </p>
                        </div>
                    ))}
                    {images.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-500">No images found. Upload one!</div>
                    )}
                </div>
            </div>
        </div>
    );
}
