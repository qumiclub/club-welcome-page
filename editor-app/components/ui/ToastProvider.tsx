"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Toast } from "./Toast";
import type { ToastData, ToastVariant } from "./Toast";

interface ToastContextValue {
    success: (message: string) => void;
    error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const SUCCESS_AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const idRef = useRef(0);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const show = useCallback(
        (type: ToastVariant, message: string) => {
            idRef.current += 1;
            const id = `toast-${idRef.current}`;
            setToasts((prev) => [...prev, { id, type, message }]);

            // Success toasts auto-dismiss; error toasts stay until closed manually
            // so the user has time to read/act on the failure.
            if (type === "success") {
                setTimeout(() => dismiss(id), SUCCESS_AUTO_DISMISS_MS);
            }
        },
        [dismiss]
    );

    const value: ToastContextValue = {
        success: (message: string) => show("success", message),
        error: (message: string) => show("error", message),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
                {toasts.map((t) => (
                    <div key={t.id} className="pointer-events-auto">
                        <Toast toast={t} onClose={dismiss} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return ctx;
}
