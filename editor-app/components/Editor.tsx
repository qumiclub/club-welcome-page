"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSession, signIn, signOut } from "next-auth/react";

export default function Editor() {
    const { data: session } = useSession();
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [tags, setTags] = useState('');
    const [content, setContent] = useState('');
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
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to publish');
            }

            setMessage('Successfully published! It may take a few minutes to appear on the site.');
            // Reset form? Maybe not, in case they want to edit.
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setIsSubmitting(false);
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

            const imageMarkdown = `![${file.name}](${data.url})`;
            setContent(prev => prev + '\n' + imageMarkdown + '\n');
            setMessage('Image uploaded successfully!');
        } catch (error: any) {
            setMessage(`Upload Error: ${error.message}`);
        } finally {
            setIsUploadingImage(false); // Use isUploadingImage state
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Club Article Editor</h1>
                <div className="flex items-center gap-4">
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
                            className="w-full p-2 border rounded mb-2 text-lg font-semibold"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="Author Name"
                                className="flex-1 p-2 border rounded"
                                value={author}
                                onChange={(e) => setAuthor(e.target.value)}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Tags (comma separated)"
                                className="flex-1 p-2 border rounded"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                            />
                        </div>
                    </div>

                    <textarea
                        className="flex-1 w-full p-4 border rounded shadow resize-none font-mono"
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
                <div className="bg-white p-6 rounded shadow overflow-y-auto prose max-w-none">
                    <h1 className="mb-2">{title || 'Untitled'}</h1>
                    <div className="text-sm text-gray-500 mb-4">
                        {author && <span>By {author}</span>}
                        {tags && <span className="ml-4">Tags: {tags}</span>}
                    </div>
                    <hr className="my-4" />
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            </div>
        </div>
    );
}
