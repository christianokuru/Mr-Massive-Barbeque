import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/validation";
import { emails } from "@/server/email";

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

export const auth = betterAuth({
  appName: "Massive Barbeque",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: false }),
  trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await emails.resetPassword(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      await emails.verify(user.email, url);
    },
  },
  socialProviders: google,
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 300, max: 8 },
      "/sign-up/email": { window: 3600, max: 6 },
      "/request-password-reset": { window: 3600, max: 5 },
      "/forget-password": { window: 3600, max: 5 },
      "/reset-password": { window: 3600, max: 10 },
      "/send-verification-email": { window: 3600, max: 5 },
      "/change-password": { window: 3600, max: 10 },
      "/delete-user": { window: 3600, max: 5 },
    },
  },
  user: {
    changeEmail: { enabled: false },
    deleteUser: { enabled: false }, // handled by our own server action (keeps orders, removes PII)
  },
  advanced: {
    useSecureCookies: (process.env.BETTER_AUTH_URL ?? "").startsWith("https://"),
  },
  plugins: [nextCookies()], // must stay last
});

export type Session = typeof auth.$Infer.Session;
