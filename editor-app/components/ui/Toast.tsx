"use client";

import React from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

export type ToastVariant = "success" | "error";

export interface ToastData {
    id: string;
    type: ToastVariant;
    message: string;
}

interface ToastProps {
    toast: ToastData;
    onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
    const isSuccess = toast.type === "success";

    return (
        <div
            role="status"
            className={`flex w-80 max-w-[90vw] items-start gap-3 rounded-lg border p-3 shadow-lg ${isSuccess
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
        >
            {isSuccess ? (
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600" />
            ) : (
                <XCircle size={20} className="mt-0.5 shrink-0 text-red-600" />
            )}
            <p className="flex-1 text-sm">{toast.message}</p>
            <button
                type="button"
                onClick={() => onClose(toast.id)}
                aria-label="Close notification"
                className="shrink-0 rounded p-0.5 text-current opacity-60 hover:opacity-100"
            >
                <X size={16} />
            </button>
        </div>
    );
}
