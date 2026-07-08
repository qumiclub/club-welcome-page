"use client";

import React, { useCallback, useMemo, useState } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import { Loader2 } from 'lucide-react';
import { useToast } from './ui/ToastProvider';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { MetaForm } from './editor/MetaForm';
import { ImageManagerModal } from './editor/ImageManagerModal';
import type { ImageInfo } from './editor/ImageManagerModal';
import { MarkdownPreview } from './editor/MarkdownPreview';
import { useDraftAutosave } from '@/lib/useDraftAutosave';
import type { DraftSnapshot } from '@/lib/useDraftAutosave';

interface EditorProps {
    initialData?: {
        title: string;
        author: string;
        tags: string;
        content: string;
        sha?: string;
        filename?: string;
        date?: string;
        thumbnail?: string;
    } | null;
}

export default function Editor({ initialData }: EditorProps) {
    const { data: session } = useSession();
    const toast = useToast();
    const [title, setTitle] = useState(initialData?.title || '');
    const [author, setAuthor] = useState(initialData?.author || '');
    const [tags, setTags] = useState(initialData?.tags || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || '');
    const [showImageManager, setShowImageManager] = useState(false);
    const [images, setImages] = useState<ImageInfo[]>([]);
    const [imageManagerMode, setImageManagerMode] = useState<'insert' | 'thumbnail'>('insert');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [currentSha, setCurrentSha] = useState(initialData?.sha);
    const [currentFilename, setCurrentFilename] = useState(initialData?.filename);
    const [confirmAction, setConfirmAction] = useState<{ published: boolean } | null>(null);
    const [isDraggingImage, setIsDraggingImage] = useState(false);
    const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

    // --- Draft autosave (B-3) -------------------------------------------------
    // Baseline captured once on first render: the "unmodified" state to diff against.
    const [baselineSnapshot] = useState<DraftSnapshot>(() => ({
        title: initialData?.title || '',
        author: initialData?.author || '',
        tags: initialData?.tags || '',
        content: initialData?.content || '',
        date,
        thumbnail: initialData?.thumbnail || '',
    }));

    const snapshot: DraftSnapshot = useMemo(
        () => ({ title, author, tags, content, date, thumbnail }),
        [title, author, tags, content, date, thumbnail]
    );

    const draftKey = useMemo(
        () => (currentFilename ? `draft:edit:${currentFilename}` : 'draft:new'),
        [currentFilename]
    );

    const applyDraftSnapshot = useCallback((snap: DraftSnapshot) => {
        setTitle(snap.title ?? '');
        setAuthor(snap.author ?? '');
        setTags(snap.tags ?? '');
        setContent(snap.content ?? '');
        setDate(snap.date || baselineSnapshot.date);
        setThumbnail(snap.thumbnail ?? '');
    }, [baselineSnapshot.date]);

    const { pendingDraft, restore, discard, clearAfterCommit } = useDraftAutosave({
        draftKey,
        snapshot,
        baselineSnapshot,
        applySnapshot: applyDraftSnapshot,
    });

    const handleSubmit = async (published: boolean) => {
        const draftKeyAtSubmit = draftKey;
        const submittedSnapshot = snapshot;

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/commit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    author,
                    tags: tags.split(',').map(t => t.trim()).filter(t => t),
                    content,
                    sha: currentSha,
                    filename: currentFilename,
                    published,
                    date,
                    thumbnail,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to publish');
            }

            // Update local state with new SHA and filename to prevent mismatch on next save
            if (data.sha) {
                setCurrentSha(data.sha);
            }
            if (data.path) {
                // API returns full path like '_posts/filename.md', we need just 'filename.md'
                // decodeURIComponent で二重エンコードを防止
                const rawFilename = data.path.replace('_posts/', '');
                try {
                    setCurrentFilename(decodeURIComponent(rawFilename));
                } catch {
                    setCurrentFilename(rawFilename);
                }
            }

            clearAfterCommit(submittedSnapshot, draftKeyAtSubmit);
            toast.success(`Successfully ${published ? 'published' : 'saved as draft'}! It may take a few minutes to appear on the site.`);
            setIsSubmitting(false);
            // Disable further submissions for this session to prevent duplicates
            // Optionally reset form here if you want to allow new posts
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            toast.error(`Error: ${message}`);
            setIsSubmitting(false); // Re-enable only on error
        }
    };

    const requestSubmit = (e: React.FormEvent, published: boolean) => {
        e.preventDefault();
        setConfirmAction({ published });
    };

    const confirmSubmit = async () => {
        if (!confirmAction) return;
        const { published } = confirmAction;
        await handleSubmit(published);
        setConfirmAction(null);
    };

    const uploadImage = async (file: File) => {
        const placeholder = `\n![Uploading ${file.name}...]()\n`;
        setIsUploadingImage(true);
        setContent(prev => prev + placeholder);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to upload image');
            }

            // Insert with {{ site.baseurl }} for Jekyll compatibility
            const imageMarkdown = `![${file.name}]({{ site.baseurl }}${data.url})`;
            setContent(prev => prev.replace(placeholder, `\n${imageMarkdown}\n`));
            toast.success('Image uploaded successfully!');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setContent(prev => prev.replace(placeholder, ''));
            toast.error(`Upload Error: ${message}`);
        } finally {
            setIsUploadingImage(false);
        }
    };

    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [availableAuthors, setAvailableAuthors] = useState<string[]>([]);

    React.useEffect(() => {
        const fetchTags = async () => {
            try {
                const res = await fetch('/api/articles');
                if (!res.ok) return; // Prevent crash if API fails
                const data = await res.json();
                if (data.tags && Array.isArray(data.tags)) {
                    setAvailableTags(data.tags);
                }
                if (data.authors && Array.isArray(data.authors)) {
                    setAvailableAuthors(data.authors);
                }
            } catch (error) {
                console.error('Failed to fetch tags/authors', error);
            }
        };

        const fetchImages = async () => {
            try {
                const res = await fetch('/api/images');
                if (!res.ok) return;
                const data = await res.json();
                if (data.images && Array.isArray(data.images)) {
                    setImages(data.images);
                }
            } catch (error) {
                console.error('Failed to fetch images', error);
            }
        };

        if (session) {
            fetchTags();
            fetchImages();
        }
    }, [session]);

    const refreshImages = async () => {
        try {
            const res = await fetch('/api/images');
            if (!res.ok) return;
            const data = await res.json();
            if (data.images && Array.isArray(data.images)) {
                setImages(data.images);
            }
        } catch (error) {
            console.error('Failed to fetch images', error);
        }
    };

    const handleModalUpload = async (file: File) => {
        await uploadImage(file);
        await refreshImages();
    };

    const handleImageSelect = (image: ImageInfo) => {
        if (imageManagerMode === 'insert') {
            const imageMarkdown = `![${image.name}]({{ site.baseurl }}${image.url})`;
            setContent(prev => prev + '\n' + imageMarkdown + '\n');
        } else {
            setThumbnail(image.url);
        }
        setShowImageManager(false);
    };

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <p className="mb-4">Please sign in to access the editor.</p>
                <button
                    onClick={() => signIn()}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Sign In
                </button>
            </div>
        );
    }

    const canSubmit = !isSubmitting && !isUploadingImage && !!title && !!content;

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <header className="flex flex-wrap justify-between items-center gap-3 mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Club Article Editor</h1>
                <div className="flex items-center gap-4 flex-wrap">
                    <button
                        onClick={() => {
                            setImageManagerMode('insert');
                            setShowImageManager(true);
                        }}
                        className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm font-semibold"
                    >
                        Image Manager
                    </button>
                    <a href="/dashboard" className="text-blue-600 hover:text-blue-800 font-semibold">
                        Dashboard
                    </a>
                    <span className="text-sm text-gray-600">{session.user?.email}</span>
                    <button
                        onClick={() => signOut()}
                        className="text-sm text-red-600 hover:text-red-800"
                    >
                        Sign Out
                    </button>
                </div>
            </header>

            {pendingDraft && (
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <span>
                        A previous unsaved draft was found
                        {pendingDraft.savedAt ? ` (saved ${new Date(pendingDraft.savedAt).toLocaleString()})` : ''}.
                        Would you like to restore it?
                    </span>
                    <div className="flex gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={restore}
                            className="rounded bg-amber-600 px-3 py-1 font-semibold text-white hover:bg-amber-700"
                        >
                            Restore
                        </button>
                        <button
                            type="button"
                            onClick={discard}
                            className="rounded border border-amber-400 px-3 py-1 font-semibold text-amber-800 hover:bg-amber-100"
                        >
                            Discard
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile tab switcher (B-6): panes below stay mounted, only visibility toggles. */}
            <div className="mb-3 flex gap-1 rounded bg-gray-200 p-1 text-sm font-semibold lg:hidden">
                <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className={`flex-1 rounded py-1.5 ${activeTab === 'edit' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}
                >
                    Edit
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`flex-1 rounded py-1.5 ${activeTab === 'preview' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}
                >
                    Preview
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[calc(100vh-100px)]">
                {/* Editor Column */}
                <div className={`flex-col gap-4 ${activeTab === 'edit' ? 'flex' : 'hidden'} lg:flex`}>
                    <MetaForm
                        title={title}
                        onTitleChange={setTitle}
                        author={author}
                        onAuthorChange={setAuthor}
                        availableAuthors={availableAuthors}
                        tags={tags}
                        onTagsChange={setTags}
                        availableTags={availableTags}
                        date={date}
                        onDateChange={setDate}
                        thumbnail={thumbnail}
                        onThumbnailChange={setThumbnail}
                        onSelectThumbnail={() => {
                            setImageManagerMode('thumbnail');
                            setShowImageManager(true);
                        }}
                    />

                    <div
                        className="relative flex-1 min-h-[16rem]"
                        onDragEnter={(e) => {
                            e.preventDefault();
                            setIsDraggingImage(true);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                setIsDraggingImage(false);
                            }
                        }}
                        onDrop={async (e) => {
                            e.preventDefault();
                            setIsDraggingImage(false);
                            const files = e.dataTransfer.files;
                            if (files.length > 0 && files[0].type.startsWith('image/')) {
                                await uploadImage(files[0]);
                            }
                        }}
                    >
                        <textarea
                            className="h-full w-full p-4 border rounded shadow resize-none font-mono text-gray-900 bg-white"
                            placeholder="Write your markdown here... (Drag & Drop images supported)"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onPaste={async (e) => {
                                const items = e.clipboardData.items;
                                for (const item of items) {
                                    if (item.type.indexOf('image') !== -1) {
                                        e.preventDefault();
                                        const file = item.getAsFile();
                                        if (file) await uploadImage(file);
                                    }
                                }
                            }}
                        />
                        {isDraggingImage && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded border-2 border-dashed border-blue-400 bg-blue-50/80">
                                <p className="text-lg font-semibold text-blue-700">Drop image to upload</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={(e) => requestSubmit(e, false)}
                            disabled={!canSubmit}
                            className={`flex flex-1 items-center justify-center gap-2 py-3 rounded font-bold text-gray-700 border border-gray-300 ${!canSubmit
                                ? 'bg-gray-100 cursor-not-allowed'
                                : 'bg-white hover:bg-gray-50'
                                }`}
                        >
                            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                            {isSubmitting ? 'Saving...' : 'Save as Draft'}
                        </button>
                        <button
                            onClick={(e) => requestSubmit(e, true)}
                            disabled={!canSubmit}
                            className={`flex flex-1 items-center justify-center gap-2 py-3 rounded font-bold text-white ${!canSubmit
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                                }`}
                        >
                            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                            {isSubmitting ? 'Publishing...' : 'Publish Article'}
                        </button>
                    </div>
                </div>

                {/* Preview Column */}
                <div className={`${activeTab === 'preview' ? 'block' : 'hidden'} lg:block lg:h-full`}>
                    <MarkdownPreview title={title} author={author} tags={tags} content={content} />
                </div>
            </div>

            <ConfirmDialog
                open={!!confirmAction}
                title={confirmAction?.published ? 'Publish Article' : 'Save as Draft'}
                message={`Are you sure you want to ${confirmAction?.published ? 'publish' : 'save as draft'} this article?`}
                confirmLabel={confirmAction?.published ? 'Publish' : 'Save'}
                cancelLabel="Cancel"
                isConfirming={isSubmitting}
                onConfirm={confirmSubmit}
                onCancel={() => setConfirmAction(null)}
            />

            {showImageManager && (
                <ImageManagerModal
                    mode={imageManagerMode}
                    images={images}
                    isUploading={isUploadingImage}
                    onClose={() => setShowImageManager(false)}
                    onSelectImage={handleImageSelect}
                    onUploadFile={handleModalUpload}
                />
            )}
        </div>
    );
}
