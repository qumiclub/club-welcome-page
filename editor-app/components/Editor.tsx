"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useSession, signIn, signOut } from "next-auth/react";

interface EditorProps {
    initialData?: {
        title: string;
        author: string;
        tags: string;
        content: string;
        sha?: string;
        filename?: string;
    } | null;
}

export default function Editor({ initialData }: EditorProps) {
    const { data: session } = useSession();
    const [title, setTitle] = useState(initialData?.title || '');
    const [author, setAuthor] = useState(initialData?.author || '');
    const [tags, setTags] = useState(initialData?.tags || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [message, setMessage] = useState('');

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!confirm('Are you sure you want to publish this article?')) {
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
                    sha: initialData?.sha,
                    filename: initialData?.filename,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to publish');
            }

            setMessage('Successfully published! It may take a few minutes to appear on the site.');
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
        if (session) {
            fetchTags();
        }
    }, [session]);

    const addTag = (tag: string) => {
        const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
        if (!currentTags.includes(tag)) {
            const newTags = [...currentTags, tag].join(', ');
            setTags(newTags);
        }
        setTagSearch(''); // Clear search after adding
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Club Article Editor</h1>
                <div className="flex items-center gap-4">
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
                                                .filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()) && !tags.split(',').map(x => x.trim()).includes(t))
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
                                            {!availableTags.some(t => t.toLowerCase() === tagSearch.toLowerCase()) && (
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
                                    {tags.split(',').map(t => t.trim()).filter(t => t).map(tag => (
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

                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || isUploadingImage || !title || !content}
                        className={`w-full py-3 rounded font-bold text-white ${isSubmitting || isUploadingImage || !title || !content
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                            }`}
                    >
                        {isSubmitting ? 'Publishing...' : 'Publish Article'}
                    </button>

                    {message && (
                        <div className={`p-3 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {message}
                        </div>
                    )}
                </div>

                {/* Preview Column */}
                <div className="bg-white p-6 rounded shadow overflow-y-auto prose max-w-none text-gray-900">
                    <h1 className="mb-2 text-gray-900">{title || 'Untitled'}</h1>
                    <div className="text-sm text-gray-500 mb-4">
                        {author && <span>By {author}</span>}
                        {tags && <span className="ml-4">Tags: {tags}</span>}
                    </div>
                    <hr className="my-4" />
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
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
                                    // Using qumiclub as the owner since images are uploaded there
                                    src = `https://raw.githubusercontent.com/qumiclub/club-welcome-page/main${src}`;
                                }
                                return <img {...props} src={src} style={{ maxWidth: '100%' }} />;
                            }
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}
