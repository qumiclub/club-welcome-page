"use client";

import React, { useMemo, useState } from "react";

interface TagSelectorProps {
    /** Comma-separated tag string, matching Editor.tsx's existing `tags` form field shape. */
    tags: string;
    onChange: (newTags: string) => void;
    availableTags: string[];
}

type ComboOption =
    | { kind: "existing"; value: string }
    | { kind: "new"; value: string };

/**
 * Tag search & multi-select control. Implements the ARIA 1.2 "combobox with
 * listbox popup" keyboard pattern: ArrowDown/ArrowUp move the active option,
 * Enter selects it (or creates a new tag when none matches), Escape closes
 * the popup.
 */
export function TagSelector({ tags, onChange, availableTags }: TagSelectorProps) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const selectedTags = useMemo(
        () => String(tags).split(",").map((t) => t.trim()).filter(Boolean),
        [tags]
    );

    const options: ComboOption[] = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return [];

        const matches = availableTags
            .filter(
                (t) =>
                    String(t).toLowerCase().includes(query) &&
                    !selectedTags.includes(String(t))
            )
            .map((t): ComboOption => ({ kind: "existing", value: t }));

        const exactMatch = availableTags.some((t) => String(t).toLowerCase() === query);
        if (!exactMatch) {
            matches.push({ kind: "new", value: search.trim() });
        }
        return matches;
    }, [search, availableTags, selectedTags]);

    const addTag = (tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed) return;
        if (!selectedTags.includes(trimmed)) {
            onChange([...selectedTags, trimmed].join(", "));
        }
        setSearch("");
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const removeTag = (tag: string) => {
        onChange(selectedTags.filter((t) => t !== tag).join(", "));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || options.length === 0) {
            if (e.key === "ArrowDown" && options.length > 0) {
                e.preventDefault();
                setIsOpen(true);
                setActiveIndex(0);
            }
            return;
        }

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % options.length);
                break;
            case "ArrowUp":
                e.preventDefault();
                setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
                break;
            case "Enter":
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < options.length) {
                    addTag(options[activeIndex].value);
                } else if (options.length > 0) {
                    addTag(options[0].value);
                }
                break;
            case "Escape":
                e.preventDefault();
                setIsOpen(false);
                setActiveIndex(-1);
                break;
            default:
                break;
        }
    };

    const listboxId = "tag-selector-listbox";
    const activeOptionId =
        activeIndex >= 0 && activeIndex < options.length ? `tag-option-${activeIndex}` : undefined;

    return (
        <div className="flex-1 flex flex-col">
            <div className="relative">
                <input
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen && options.length > 0}
                    aria-controls={listboxId}
                    aria-activedescendant={activeOptionId}
                    aria-autocomplete="list"
                    placeholder="タグを検索・追加..."
                    className="w-full p-2 border rounded text-gray-900 bg-white"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                        setActiveIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                        // Allow option mousedown to register before closing.
                        setTimeout(() => setIsOpen(false), 100);
                    }}
                />
                {isOpen && options.length > 0 && (
                    <div
                        id={listboxId}
                        role="listbox"
                        className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-40 overflow-y-auto mt-1"
                    >
                        {options.map((option, index) => (
                            <button
                                key={`${option.kind}-${option.value}`}
                                id={`tag-option-${index}`}
                                role="option"
                                aria-selected={index === activeIndex}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => addTag(option.value)}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={`block w-full text-left px-3 py-2 text-sm ${index === activeIndex ? "bg-gray-100" : ""
                                    } ${option.kind === "new" ? "text-primary font-semibold" : "text-gray-800"}`}
                            >
                                {option.kind === "new" ? `新規タグ: "${option.value}"` : option.value}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#ccfbf1] text-[#0f766e]"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-[#0f766e] hover:text-ink focus:outline-none"
                            aria-label={`タグ「${tag}」を削除`}
                        >
                            ×
                        </button>
                    </span>
                ))}
            </div>
        </div>
    );
}
