'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { ShieldAlert } from 'lucide-react';

function ErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
                <div className="mb-4 text-red-500">
                    <ShieldAlert className="mx-auto h-16 w-16" />
                </div>

                <h1 className="text-2xl font-bold text-ink mb-2">アクセスが拒否されました</h1>

                <p className="text-slate-600 mb-8">
                    {error === 'AccessDenied'
                        ? 'このメールアドレスは許可リストに登録されていません。部員用の許可されたGoogleアカウントでログインしてください。'
                        : '認証中にエラーが発生しました。'}
                </p>

                <Link
                    href="/"
                    className="inline-block w-full px-6 py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    トップページに戻ってやり直す
                </Link>
            </div>
        </div>
    );
}

export default function ErrorPage() {
    return (
        <Suspense fallback={<div>読み込み中...</div>}>
            <ErrorContent />
        </Suspense>
    );
}
