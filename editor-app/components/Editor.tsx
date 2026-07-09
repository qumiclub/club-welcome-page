"use client";

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSession } from "next-auth/react";
import { Loader2 } from 'lucide-react';
import { useToast } from './ui/ToastProvider';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { AppHeader } from './AppHeader';
import { SignInPrompt } from './SignInPrompt';
import { MetaForm } from './editor/MetaForm';
import { ImageManagerModal } from './editor/ImageManagerModal';
import type { ImageInfo } from './editor/ImageManagerModal';
import { MarkdownPreview } from './editor/MarkdownPreview';
import { MarkdownToolbar } from './editor/MarkdownToolbar';
import { wrapSelection } from '@/lib/markdownFormat';
import type { FormatFn } from '@/lib/markdownFormat';
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const { pendingDraft, restore, discard, clearAfterCommit, lastSavedAt, isPending } = useDraftAutosave({
        draftKey,
        snapshot,
        baselineSnapshot,
        applySnapshot: applyDraftSnapshot,
    });

    const autosaveStatusLabel = isPending
        ? '編集中…'
        : lastSavedAt
            ? `自動保存済み ${new Date(lastSavedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
            : null;

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
                throw new Error(data.error || '公開に失敗しました');
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
            toast.success(
                published
                    ? '公開しました。サイトへの反映まで数分かかることがあります。'
                    : '下書きとして保存しました。'
            );
            setIsSubmitting(false);
            // Disable further submissions for this session to prevent duplicates
            // Optionally reset form here if you want to allow new posts
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            toast.error(`エラー: ${message}`);
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
        const placeholder = `\n![アップロード中: ${file.name}]()\n`;
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
                throw new Error(data.error || '画像のアップロードに失敗しました');
            }

            // Insert with {{ site.baseurl }} for Jekyll compatibility
            const imageMarkdown = `![${file.name}]({{ site.baseurl }}${data.url})`;
            setContent(prev => prev.replace(placeholder, `\n${imageMarkdown}\n`));
            toast.success('画像をアップロードしました。');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            setContent(prev => prev.replace(placeholder, ''));
            toast.error(`アップロードエラー: ${message}`);
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

    const openImageManager = () => {
        setImageManagerMode('insert');
        setShowImageManager(true);
    };

    // --- Markdownツールバー / ショートカット --------------------------------
    // ツールバーのボタンとキーボードショートカットは同じ適用ロジックを共有する:
    // テキストエリアの選択範囲を取り、フォーマット関数で書き換えた結果を反映してから
    // 次のフレームで選択範囲を復元する（Reactの再レンダー後でないと反映されないため）。
    const applyFormat = useCallback((formatter: FormatFn) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const { selectionStart, selectionEnd } = textarea;
        const result = formatter(content, selectionStart, selectionEnd);
        setContent(result.value);

        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(result.selStart, result.selEnd);
        });
    }, [content]);

    const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const isMod = e.ctrlKey || e.metaKey;
        if (!isMod) return;

        const key = e.key.toLowerCase();
        if (key === 'b') {
            e.preventDefault();
            applyFormat((v, s, en) => wrapSelection(v, s, en, '**'));
        } else if (key === 'i') {
            e.preventDefault();
            applyFormat((v, s, en) => wrapSelection(v, s, en, '_'));
        } else if (key === 's') {
            e.preventDefault();
            // 下書き保存の確認ダイアログを開く（そのまま送信はしない）
            setConfirmAction({ published: false });
        }
    };

    if (!session) {
        return <SignInPrompt message="エディタを利用するにはログインが必要です。" />;
    }

    const canSubmit = !isSubmitting && !isUploadingImage && !!title && !!content;

    return (
        <div className="min-h-screen bg-gray-50">
            <AppHeader userEmail={session.user?.email}>
                <button
                    onClick={openImageManager}
                    className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm font-semibold"
                >
                    画像管理
                </button>
            </AppHeader>

            <div className="p-4">
                {pendingDraft && (
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <span>
                            前回の未保存の下書きが見つかりました
                            {pendingDraft.savedAt ? `（保存日時: ${new Date(pendingDraft.savedAt).toLocaleString('ja-JP')}）` : ''}。
                            復元しますか？
                        </span>
                        <div className="flex gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={restore}
                                className="rounded bg-amber-600 px-3 py-1 font-semibold text-white hover:bg-amber-700"
                            >
                                復元する
                            </button>
                            <button
                                type="button"
                                onClick={discard}
                                className="rounded border border-amber-400 px-3 py-1 font-semibold text-amber-800 hover:bg-amber-100"
                            >
                                破棄する
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
                        編集
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        className={`flex-1 rounded py-1.5 ${activeTab === 'preview' ? 'bg-white text-gray-900 shadow' : 'text-gray-600'}`}
                    >
                        プレビュー
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-[calc(100vh-140px)]">
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

                        <MarkdownToolbar onFormat={applyFormat} onOpenImageManager={openImageManager} />

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
                                ref={textareaRef}
                                className="h-full w-full rounded-t-none rounded-b border border-t-0 p-4 shadow resize-none font-mono text-gray-900 bg-white"
                                placeholder="ここにMarkdownを入力してください（画像のドラッグ＆ドロップに対応）"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                onKeyDown={handleTextareaKeyDown}
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
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded border-2 border-dashed border-primary bg-teal-50/80">
                                    <p className="text-lg font-semibold text-primary-dark">画像をドロップしてアップロード</p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                            <span>{content.length.toLocaleString()}文字</span>
                            {autosaveStatusLabel && <span>{autosaveStatusLabel}</span>}
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
                                {isSubmitting ? '保存中...' : '下書き保存'}
                            </button>
                            <button
                                onClick={(e) => requestSubmit(e, true)}
                                disabled={!canSubmit}
                                className={`flex flex-1 items-center justify-center gap-2 py-3 rounded font-bold text-white ${!canSubmit
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-primary hover:bg-primary-dark'
                                    }`}
                            >
                                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                                {isSubmitting ? '公開中...' : '公開する'}
                            </button>
                        </div>
                    </div>

                    {/* Preview Column */}
                    <div className={`${activeTab === 'preview' ? 'block' : 'hidden'} lg:block lg:h-full`}>
                        <MarkdownPreview title={title} author={author} tags={tags} content={content} />
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={!!confirmAction}
                title={confirmAction?.published ? '記事を公開' : '下書き保存'}
                message={`この記事を${confirmAction?.published ? '公開' : '下書きとして保存'}しますか？`}
                confirmLabel={confirmAction?.published ? '公開する' : '保存する'}
                cancelLabel="キャンセル"
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
