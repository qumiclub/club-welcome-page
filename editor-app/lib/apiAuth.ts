import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

interface EditorSessionResult {
    session: Session | null;
    /** Set when the request should be rejected — the route should `return response`. */
    response: NextResponse | null;
}

/**
 * セッションと ALLOWED_EMAILS を「リクエストごとに」再検証する。
 *
 * NextAuth の signIn コールバックはサインイン時にしか走らないため、ALLOWED_EMAILS を
 * 後から変更（部員の脱退など）しても、既存のセッション Cookie が残っている限り
 * API 経由でのアクセスを防げなかった。全APIルートの入口でこの関数を呼ぶことで、
 * 許可リストの変更を毎リクエスト即時に反映する。
 */
export async function requireEditorSession(): Promise<EditorSessionResult> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return {
            session: null,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        };
    }

    const allowedEmails = (process.env.ALLOWED_EMAILS || "")
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

    if (!allowedEmails.includes(session.user.email)) {
        return {
            session: null,
            response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        };
    }

    return { session, response: null };
}
