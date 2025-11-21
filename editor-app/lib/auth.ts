import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            if (!user.email) return false;

            // Get allowed emails from env var (comma separated)
            const allowedEmails = (process.env.ALLOWED_EMAILS || "").split(",").map(e => e.trim());

            // Check if email is in the list
            // Also support wildcard domain like *@kyushu-u.ac.jp if needed, but for now strict list
            if (allowedEmails.includes(user.email)) {
                return true;
            }

            console.log(`Access denied for: ${user.email}`);
            return false;
        },
    },
    // pages: {
    //     signIn: '/auth/signin', // Custom signin page if needed, or default
    //     error: '/auth/error', // Error code passed in query string as ?error=
    // },
};
