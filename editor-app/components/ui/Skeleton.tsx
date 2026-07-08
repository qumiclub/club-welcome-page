import React from "react";

/**
 * Generic pulse-animated placeholder block. Compose with Tailwind
 * width/height utility classes to build page-specific skeleton shapes.
 */
export function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}
