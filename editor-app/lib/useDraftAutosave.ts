"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface DraftSnapshot {
    title: string;
    author: string;
    tags: string;
    content: string;
    date: string;
    thumbnail: string;
}

export type StoredDraft = DraftSnapshot & { savedAt: number };

interface UseDraftAutosaveOptions {
    /** localStorage key. May change over time (e.g. `draft:new` -> `draft:edit:<filename>` after first publish). */
    draftKey: string;
    /** Current live form values. */
    snapshot: DraftSnapshot;
    /** The "unmodified" baseline (server-loaded data, or blanks for a new article). */
    baselineSnapshot: DraftSnapshot;
    /** Applies a restored draft back onto the form state. */
    applySnapshot: (snapshot: DraftSnapshot) => void;
}

const AUTOSAVE_DEBOUNCE_MS = 2000;

function isSameSnapshot(a: DraftSnapshot, b: DraftSnapshot): boolean {
    return (
        a.title === b.title &&
        a.author === b.author &&
        a.tags === b.tags &&
        a.content === b.content &&
        a.date === b.date &&
        a.thumbnail === b.thumbnail
    );
}

/**
 * Debounced localStorage draft autosave + restore-on-mount + beforeunload guard.
 *
 * On mount, looks for a leftover draft under `draftKey`. For a brand-new article
 * any leftover draft is offered for restore; for an existing article it is only
 * offered when it differs from the freshly loaded server content (otherwise
 * there is nothing to restore). While a restore decision is pending, autosaving
 * is paused so we don't silently overwrite the pending draft.
 */
export function useDraftAutosave({
    draftKey,
    snapshot,
    baselineSnapshot,
    applySnapshot,
}: UseDraftAutosaveOptions) {
    const [pendingDraft, setPendingDraft] = useState<StoredDraft | null>(null);
    const [ready, setReady] = useState(false);
    /** 直近でlocalStorageへ自動保存が完了した時刻（表示用: 「自動保存済み HH:MM」）。 */
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
    /** デバウンス待機中かどうか（表示用: 「編集中…」）。 */
    const [isPending, setIsPending] = useState(false);
    const baselineRef = useRef<DraftSnapshot>(baselineSnapshot);
    const isDirtyRef = useRef(false);
    const draftKeyRef = useRef(draftKey);

    // Look for an existing draft once, on mount.
    useEffect(() => {
        draftKeyRef.current = draftKey;
        try {
            const raw = localStorage.getItem(draftKey);
            if (raw) {
                const parsed = JSON.parse(raw) as StoredDraft;
                if (!isSameSnapshot(parsed, baselineSnapshot)) {
                    setPendingDraft(parsed);
                    return;
                }
            }
        } catch {
            // Malformed/unavailable storage - ignore and proceed as if no draft existed.
        }
        setReady(true);
        // Intentionally run only once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Track the latest key (e.g. once a new article is first published and gets a filename).
    useEffect(() => {
        draftKeyRef.current = draftKey;
    }, [draftKey]);

    // Debounced autosave + dirty tracking.
    useEffect(() => {
        if (!ready) return;
        isDirtyRef.current = !isSameSnapshot(snapshot, baselineRef.current);
        setIsPending(true);

        const timer = setTimeout(() => {
            try {
                const toStore: StoredDraft = { ...snapshot, savedAt: Date.now() };
                localStorage.setItem(draftKeyRef.current, JSON.stringify(toStore));
                setLastSavedAt(toStore.savedAt);
            } catch {
                // Storage full/unavailable - autosave is best-effort.
            } finally {
                setIsPending(false);
            }
        }, AUTOSAVE_DEBOUNCE_MS);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, snapshot.title, snapshot.author, snapshot.tags, snapshot.content, snapshot.date, snapshot.thumbnail]);

    // beforeunload guard, only while dirty.
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (isDirtyRef.current) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, []);

    const restore = useCallback(() => {
        if (pendingDraft) {
            applySnapshot(pendingDraft);
        }
        setPendingDraft(null);
        setReady(true);
    }, [pendingDraft, applySnapshot]);

    const discard = useCallback(() => {
        try {
            localStorage.removeItem(draftKeyRef.current);
        } catch {
            // ignore
        }
        setPendingDraft(null);
        setReady(true);
    }, []);

    /** Call after a successful commit to clear the on-disk draft and reset the dirty baseline. */
    const clearAfterCommit = useCallback((committedSnapshot: DraftSnapshot, keyAtCommit: string) => {
        try {
            localStorage.removeItem(keyAtCommit);
        } catch {
            // ignore
        }
        baselineRef.current = committedSnapshot;
        isDirtyRef.current = false;
        setLastSavedAt(null);
    }, []);

    return { pendingDraft, restore, discard, clearAfterCommit, lastSavedAt, isPending };
}
