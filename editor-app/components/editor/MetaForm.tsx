"use client";

import React from "react";
import { TagSelector } from "./TagSelector";
import { resolveImageSrc } from "@/lib/imageUrl";

interface MetaFormProps {
    title: string;
    onTitleChange: (value: string) => void;
    author: string;
    onAuthorChange: (value: string) => void;
    availableAuthors: string[];
    tags: string;
    onTagsChange: (value: string) => void;
    availableTags: string[];
    date: string;
    onDateChange: (value: string) => void;
    thumbnail: string;
    onThumbnailChange: (value: string) => void;
    onSelectThumbnail: () => void;
}

/** タイトル・著者・タグ・日付・サムネイルの入力欄。 */
export function MetaForm({
    title,
    onTitleChange,
    author,
    onAuthorChange,
    availableAuthors,
    tags,
    onTagsChange,
    availableTags,
    date,
    onDateChange,
    thumbnail,
    onThumbnailChange,
    onSelectThumbnail,
}: MetaFormProps) {
    const thumbnailSrc = resolveImageSrc(thumbnail);

    return (
        <>
            <div className="bg-white p-4 rounded shadow">
                <input
                    type="text"
                    placeholder="記事タイトル"
                    className="w-full p-2 border rounded mb-2 text-lg font-semibold text-gray-900 bg-white"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    required
                />
                <div className="flex flex-col sm:flex-row gap-2 mb-2 items-start">
                    <div className="flex-1 w-full">
                        <input
                            type="text"
                            placeholder="著者名"
                            className="w-full p-2 border rounded text-gray-900 bg-white"
                            value={author}
                            onChange={(e) => onAuthorChange(e.target.value)}
                            required
                            list="authors-list"
                        />
                        <datalist id="authors-list">
                            {availableAuthors.map((a) => (
                                <option key={a} value={a} />
                            ))}
                        </datalist>
                    </div>
                    <TagSelector tags={tags} onChange={onTagsChange} availableTags={availableTags} />
                </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">日付</label>
                    <input
                        type="date"
                        className="w-full p-2 border rounded text-gray-900 bg-white"
                        value={date}
                        onChange={(e) => onDateChange(e.target.value)}
                    />
                </div>
                <div className="flex-[2]">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                        サムネイル画像URL（または画像管理から選択）
                    </label>
                    <div className="flex items-start gap-2">
                        {thumbnailSrc && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={thumbnailSrc}
                                alt=""
                                className="h-20 w-20 shrink-0 rounded border object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                        )}
                        <div className="flex flex-1 flex-col gap-2">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="/assets/images/..."
                                    className="w-full p-2 border rounded text-gray-900 bg-white"
                                    value={thumbnail}
                                    onChange={(e) => onThumbnailChange(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={onSelectThumbnail}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 whitespace-nowrap"
                                >
                                    選択
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
