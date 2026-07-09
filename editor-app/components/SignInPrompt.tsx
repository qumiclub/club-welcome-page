"use client";

import { signIn } from "next-auth/react";

interface SignInPromptProps {
    message?: string;
}

/** 未認証時に表示する共通のサインイン導線。Editor / Dashboard / 編集ページで共有する。 */
export function SignInPrompt({
    message = "このページを利用するにはログインが必要です。",
}: SignInPromptProps) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-white">
                情
            </div>
            <p className="text-slate-600">{message}</p>
            <button
                type="button"
                onClick={() => signIn()}
                className="rounded-md bg-primary px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-primary-dark"
            >
                ログイン
            </button>
        </div>
    );
}
