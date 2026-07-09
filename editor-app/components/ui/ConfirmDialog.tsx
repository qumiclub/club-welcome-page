"use client";

import React, { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "default" | "danger";
    isConfirming?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * A minimal Tailwind-only confirmation modal to replace window.confirm().
 * Closes on Escape or backdrop click. Focuses the confirm button on open
 * as a simple (non-exhaustive) focus affordance.
 */
export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = "確認",
    cancelLabel = "キャンセル",
    variant = "default",
    isConfirming = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const confirmButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;

        confirmButtonRef.current?.focus();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onCancel();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, onCancel]);

    if (!open) return null;

    const confirmClasses =
        variant === "danger"
            ? "bg-red-600 hover:bg-red-700 disabled:bg-red-300"
            : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="presentation"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-dialog-title" className="text-lg font-bold text-gray-900">
                    {title}
                </h2>
                {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isConfirming}
                        className="rounded px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmButtonRef}
                        type="button"
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-semibold text-white ${confirmClasses}`}
                    >
                        {isConfirming && <Loader2 size={16} className="animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
