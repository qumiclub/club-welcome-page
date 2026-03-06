"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import SyntaxHighlighter from 'react-syntax-highlighter/dist/cjs/prism';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useSession, signIn, signOut } from "next-auth/react";
import '../app/preview.css';

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
    const [title, setTitle] = useState(initialData?.title || '');
    const [author, setAuthor] = useState(initialData?.author || '');
    const [tags, setTags] = useState(initialData?.tags || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || '');
    const [showImageManager, setShowImageManager] = useState(false);
    const [images, setImages] = useState<any[]>([]);
    const [imageManagerMode, setImageManagerMode] = useState<'insert' | 'thumbnail'>('insert');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [currentSha, setCurrentSha] = useState(initialData?.sha);
    const [currentFilename, setCurrentFilename] = useState(initialData?.filename);
    const [message, setMessage] = useState('');



    const handleSubmit = async (e: React.FormEvent, published: boolean = true) => {
        e.preventDefault();

        if (!confirm(`Are you sure you want to ${published ? 'publish' : 'save as draft'} this article?`)) {
            return;
        }

        setIsSubmitting(true);
        setMessage('');

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
                setCurrentFilename(data.path.replace('_posts/', ''));
            }

            setMessage(`Successfully ${published ? 'published' : 'saved as draft'}! It may take a few minutes to appear on the site.`);
            setIsSubmitting(false);
            // Disable further submissions for this session to prevent duplicates
            // Optionally reset form here if you want to allow new posts
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
            setIsSubmitting(false); // Re-enable only on error
        }
    };

    const uploadImage = async (file: File) => {
        setIsUploadingImage(true); // Use isUploadingImage state
        setMessage('Uploading image...');

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
            setContent(prev => prev + '\n' + imageMarkdown + '\n');
            setMessage('Image uploaded successfully!');
        } catch (error: any) {
            setMessage(`Upload Error: ${error.message}`);
        } finally {
            setIsUploadingImage(false); // Use isUploadingImage state
        }
    };

    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [availableAuthors, setAvailableAuthors] = useState<string[]>([]);
    const [tagSearch, setTagSearch] = useState('');

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

    const addTag = (tag: string) => {
        const currentTags = String(tags).split(',').map(t => t.trim()).filter(t => t);
        if (!currentTags.includes(tag)) {
            const newTags = [...currentTags, tag].join(', ');
            setTags(newTags);
        }
        setTagSearch(''); // Clear search after adding
    };

    const handleImageSelect = (image: any) => {
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

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Club Article Editor</h1>
                <div className="flex items-center gap-4">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-100px)]">
                {/* Editor Column */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white p-4 rounded shadow">
                        <input
                            type="text"
                            placeholder="Article Title"
                            className="w-full p-2 border rounded mb-2 text-lg font-semibold text-gray-900 bg-white"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                        <div className="flex gap-2 mb-2 items-start">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    placeholder="Author Name"
                                    className="w-full p-2 border rounded text-gray-900 bg-white"
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    required
                                    list="authors-list"
                                />
                                <datalist id="authors-list">
                                    {availableAuthors.map(a => (
                                        <option key={a} value={a} />
                                    ))}
                                </datalist>
                            </div>
                            <div className="flex-1 flex flex-col">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search & Add Tags..."
                                        className="w-full p-2 border rounded text-gray-900 bg-white"
                                        value={tagSearch}
                                        onChange={(e) => setTagSearch(e.target.value)}
                                    />
                                    {/* Tag Suggestions Dropdown */}
                                    {tagSearch && (
                                        <div className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-40 overflow-y-auto mt-1">
                                            {availableTags
                                                .filter(t => String(t).toLowerCase().includes(tagSearch.toLowerCase()) && !String(tags).split(',').map(x => x.trim()).includes(String(t)))
                                                .map(tag => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => addTag(tag)}
                                                        className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-gray-800"
                                                        type="button"
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            {/* Option to add new tag if it doesn't exist */}
                                            {!availableTags.some(t => String(t).toLowerCase() === tagSearch.toLowerCase()) && (
                                                <button
                                                    onClick={() => addTag(tagSearch)}
                                                    className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-blue-600 font-semibold"
                                                    type="button"
                                                >
                                                    Add new: "{tagSearch}"
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {/* Selected Tags Display */}
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {String(tags).split(',').map(t => t.trim()).filter(t => t).map(tag => (
                                        <span key={tag} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newTags = tags.split(',').map(t => t.trim()).filter(t => t !== tag).join(', ');
                                                    setTags(newTags);
                                                }}
                                                className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mb-2">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded text-gray-900 bg-white"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div className="flex-[2]">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Thumbnail URL (or select from Image Manager)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="/assets/images/..."
                                    className="w-full p-2 border rounded text-gray-900 bg-white"
                                    value={thumbnail}
                                    onChange={(e) => setThumbnail(e.target.value)}
                                />
                                <button
                                    onClick={() => {
                                        setImageManagerMode('thumbnail');
                                        setShowImageManager(true);
                                    }}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                >
                                    Select
                                </button>
                            </div>
                        </div>
                    </div>


                    <textarea
                        className="flex-1 w-full p-4 border rounded shadow resize-none font-mono text-gray-900 bg-white"
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
                        onDrop={async (e) => {
                            e.preventDefault();
                            const files = e.dataTransfer.files;
                            if (files.length > 0 && files[0].type.startsWith('image/')) {
                                await uploadImage(files[0]);
                            }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                    />

                    <div className="flex gap-2">
                        <button
                            onClick={(e) => handleSubmit(e, false)}
                            disabled={isSubmitting || isUploadingImage || !title || !content}
                            className={`flex-1 py-3 rounded font-bold text-gray-700 border border-gray-300 ${isSubmitting || isUploadingImage || !title || !content
                                ? 'bg-gray-100 cursor-not-allowed'
                                : 'bg-white hover:bg-gray-50'
                                }`}
                        >
                            {isSubmitting ? 'Saving...' : 'Save as Draft'}
                        </button>
                        <button
                            onClick={(e) => handleSubmit(e, true)}
                            disabled={isSubmitting || isUploadingImage || !title || !content}
                            className={`flex-1 py-3 rounded font-bold text-white ${isSubmitting || isUploadingImage || !title || !content
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                                }`}
                        >
                            {isSubmitting ? 'Publishing...' : 'Publish Article'}
                        </button>
                    </div>

                    {message && (
                        <div className={`p-3 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {message}
                        </div>
                    )}
                </div>

                {/* Preview Column */}
                <div className="bg-white p-6 rounded shadow overflow-y-auto preview-container">
                    <h1 className="article-title">{title || 'Untitled'}</h1>
                    <div className="article-meta">
                        {author && <span className="author-info">By {author}</span>}
                        {tags && (
                            <div className="article-tags ml-4">
                                {String(tags).split(',').map(t => t.trim()).filter(t => t).map(tag => (
                                    <span key={tag} className="tag">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                    <hr className="my-4" />
                    <div className="main-content">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                code({ node, inline, className, children, ...props }: any) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return !inline && match ? (
                                        <SyntaxHighlighter
                                            style={vscDarkPlus}
                                            language={match[1]}
                                            PreTag="div"
                                            {...props}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    ) : (
                                        <code className={className} {...props}>
                                            {children}
                                        </code>
                                    )
                                },
                                img: ({ node, ...props }) => {
                                    let src = (props.src as string) || '';
                                    // Handle Jekyll baseurl
                                    if (src.includes('{{ site.baseurl }}')) {
                                        src = src.replace('{{ site.baseurl }}', '');
                                    }
                                    if (src.startsWith('/assets/images/')) {
                                        // Rewrite relative path to GitHub Raw URL for preview
                                        // Note: This will work as long as the repo structure is consistent
                                        src = `https://raw.githubusercontent.com/${process.env.NEXT_PUBLIC_GITHUB_OWNER || 'qumiclub'}/${process.env.NEXT_PUBLIC_GITHUB_REPO || 'club-welcome-page'}/main${src}`;
                                    }
                                    return <img {...props} src={src} style={{ maxWidth: '100%' }} />;
                                }
                            }}
                        >
                            {content.replace(/\{\{\s*site\.baseurl\s*\}\}/g, '')}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>

            {/* Image Manager Modal */}
            {
                showImageManager && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800">Image Manager ({imageManagerMode === 'insert' ? 'Insert to Content' : 'Select Thumbnail'})</h2>
                                <button onClick={() => setShowImageManager(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Upload New Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        if (e.target.files?.[0]) {
                                            await uploadImage(e.target.files[0]);
                                            // Refresh images list
                                            const res = await fetch('/api/images');
                                            if (res.ok) {
                                                const data = await res.json();
                                                setImages(data.images);
                                            }
                                        }
                                    }}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-4 gap-4 p-2 border rounded">
                                {images.map((img) => (
                                    <div
                                        key={img.path}
                                        className="border rounded p-2 hover:bg-blue-50 cursor-pointer flex flex-col items-center"
                                        onClick={() => handleImageSelect(img)}
                                    >
                                        <div className="h-32 w-full flex items-center justify-center bg-gray-100 mb-2 overflow-hidden">
                                            <img src={img.download_url} alt={img.name} className="max-h-full max-w-full object-contain" />
                                        </div>
                                        <p className="text-xs text-center truncate w-full" title={img.name}>{img.name}</p>
                                    </div>
                                ))}
                                {images.length === 0 && (
                                    <div className="col-span-full text-center py-8 text-gray-500">No images found. Upload one!</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
