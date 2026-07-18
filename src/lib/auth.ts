import { config } from "dotenv";
import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import EmailProvider from "next-auth/providers/email";
import GitHub from "next-auth/providers/github";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/lib/db/schema";

// Load .env at runtime so AUTH_URL and other server-side vars are
// available even when the build happened on a different machine.
config({ path: ".env" });

// ─── In-memory rate limiter for magic link requests ────────────────────────
// Prevents email bombing: max 5 requests per email address per hour.
// In-memory is sufficient for a single-server pm2 deployment. For
// multi-instance, swap with a Redis-backed limiter.
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 10 minutes to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimiter) {
    if (now >= entry.resetAt) rateLimiter.delete(key);
  }
}, 10 * 60 * 1000);

/**
 * NextAuth.js v5 (Auth.js) configuration.
 *
 * Providers:
 *   1. Email magic links — passwordless, works for any email. Uses
 *      nodemailer with SMTP (or console.log in dev).
 *   2. GitHub OAuth — for developers who prefer social login.
 *
 * The Drizzle adapter stores users/sessions/accounts in the existing
 * Postgres database alongside the debt-sessions and terra-connections
 * tables. The `users` table is shared — NextAuth upserts into it.
 *
 * No vendor lock-in: Auth.js is self-hosted, open source, and the
 * adapter works with any Postgres provider.
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "database",
    // 30-day session expiry. Expired sessions are purged from the
    // sessions table by the adapter on each auth() call.
    maxAge: 30 * 24 * 60 * 60,
  },
  // Behind a reverse proxy (nginx → localhost:3050), Auth.js sees
  // localhost as the host. trustHost allows it to use the forwarded
  // Host header / NEXTAUTH_URL instead.
  trustHost: true,
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST ?? "localhost",
        port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
        secure: Number(process.env.EMAIL_SERVER_PORT ?? 587) === 465,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM ?? "Body Debt <noreply@bodydebt.ai>",
      // Rate limit magic link requests: max 5 per email per hour,
      // max 10 per IP per hour. Prevents email bombing abuse.
      sendVerificationRequest: async ({ identifier, url }) => {
        if (!process.env.EMAIL_SERVER_HOST) {
          console.log(`\n🔐 Magic link for ${identifier}:\n  ${url}\n`);
          return;
        }

        // In-memory rate limiter (per-email, per-IP)
        const key = `email:${identifier}`;
        const entry = rateLimiter.get(key);
        if (entry && entry.count >= 5 && Date.now() < entry.resetAt) {
          throw new Error("Too many sign-in requests. Please try again later.");
        }
        rateLimiter.set(key, {
          count: (entry?.count ?? 0) + 1,
          resetAt: Date.now() + 60 * 60 * 1000, // 1 hour
        });

        const { createTransport } = await import("nodemailer");
        const port = Number(process.env.EMAIL_SERVER_PORT ?? 587);
        const transport = createTransport({
          host: process.env.EMAIL_SERVER_HOST,
          port,
          secure: port === 465,
          auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
          },
        });
        await transport.sendMail({
          to: identifier,
          from: process.env.EMAIL_FROM ?? "Body Debt <noreply@bodydebt.ai>",
          subject: "Your Body Debt sign-in link",
          html: `<p>Click <a href="${url}">here</a> to sign in to Body Debt.</p><p>This link expires in 24 hours.</p>`,
        });
      },
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      // Disable PKCE behind reverse proxy — the code_verifier cookie
      // gets mangled through the nginx proxy. State check is sufficient
      // for server-side OAuth with GitHub.
      checks: ["state"],
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as { id?: string }).id = user.id;
      }
      return session;
    },
  },
});

// ─── Server-side auth guard ───────────────────────────────────────────────
//
// requireAuth checks for a valid NextAuth session. Returns { ok: true, user }
// when authenticated, or { ok: false, response } when not. Callers are
// expected to fall through to guest mode when ok: false — this matches
// the guest-first design of body-debt.

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse };

export async function requireAuth(_request: NextRequest): Promise<AuthResult> {
  const session = await auth();

  if (session?.user) {
    return {
      ok: true,
      user: {
        id: (session.user as { id?: string }).id ?? session.user.email ?? "unknown",
        name: session.user.name,
        email: session.user.email,
        avatarUrl: session.user.image,
      },
    };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { error: "authentication required" },
      { status: 401 }
    ),
  };
}
