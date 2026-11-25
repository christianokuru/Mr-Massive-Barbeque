"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { PASSWORD_MIN, PASSWORD_TOO_WEAK, safeNext } from "@/lib/validation";
import { PasswordField, inputClass } from "./password-field";

/** Full navigation (the post-auth hop is a route handler that decides admin vs customer). */
function go(path: string) {
  window.location.assign(new URL(path, window.location.origin).toString());
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-bonnet font-bold text-char disabled:opacity-70">
      {pending ? <Loader2 className="size-5 animate-spin" /> : null}
      {children}
    </button>
  );
}

function FormError({ error }: { error: string | null }) {
  return error ? <p className="rounded-xl bg-[#f6d6d0] p-3 text-sm font-bold text-[#7a1a0c]" role="alert" data-testid="auth-error">{error}</p> : null;
}

export function SignInForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(params.get("error") ? "That link has expired. Sign in to get a new one." : null);
  const [pending, start] = useTransition();
  const after = `/auth/after?next=${encodeURIComponent(next)}`;

  return (
    <form
      className="flex flex-col gap-4"
      data-testid="sign-in-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const { error } = await authClient.signIn.email({ email, password, callbackURL: after });
          if (error) setError(authErrorMessage(error));
          else go(after);
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Email</span>
        <input type="email" name="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </label>
      <PasswordField value={password} onChange={setPassword} />
      <Link href="/forgot-password" className="-mt-1 w-fit text-sm font-bold underline">Forgot password?</Link>
      <FormError error={error} />
      <Submit pending={pending}>Sign in</Submit>
      <p className="text-center text-sm">
        New here? <Link href={`/sign-up${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold underline">Create an account</Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"), "/account");
  const ref = params.get("ref");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card bg-white p-6" data-testid="check-email">
        <MailCheck className="size-10 text-oxblood" />
        <p className="text-subheading font-bold">Check your inbox</p>
        <p className="text-smoke">We sent a confirmation link to <strong>{email}</strong>. Tap it to finish creating your account.</p>
        <p className="text-sm text-muted-foreground">Can&apos;t find it? Check spam, or <Link href="/sign-in" className="underline">sign in</Link> to get a new link.</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      data-testid="sign-up-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setPwError(null);
        if (name.trim().length < 2) return setError("Enter your name.");
        if (password.length < PASSWORD_MIN) return setPwError(PASSWORD_TOO_WEAK);
        start(async () => {
          const after = `/auth/after?next=${encodeURIComponent(ref ? `/account/rewards?joined=1` : next)}`;
          const { error } = await authClient.signUp.email({ name: name.trim(), email, password, callbackURL: after });
          if (error) {
            if (error.code === "PASSWORD_TOO_SHORT") setPwError(PASSWORD_TOO_WEAK);
            else setError(authErrorMessage(error));
          } else setSent(true);
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Full name</span>
        <input name="name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Email</span>
        <input type="email" name="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </label>
      <PasswordField value={password} onChange={(v) => { setPassword(v); if (pwError && v.length >= PASSWORD_MIN) setPwError(null); }} meter autoComplete="new-password" error={pwError} />
      {ref ? <p className="rounded-xl bg-paprika p-3 text-sm">A friend invited you. Use code <strong>{ref.toUpperCase().slice(0, 20)}</strong> at checkout for ₦2,000 off your first order.</p> : null}
      <FormError error={error} />
      <Submit pending={pending}>Create account</Submit>
      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
      <p className="text-center text-sm">Already have an account? <Link href="/sign-in" className="font-bold underline">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (sent) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card bg-white p-6">
        <MailCheck className="size-10 text-oxblood" />
        <p className="text-smoke">If an account exists for <strong>{email}</strong>, a reset link is on its way. It expires in 1 hour.</p>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
          if (error && error.status === 429) setError(authErrorMessage(error));
          else setSent(true); // never reveal whether the email exists
        });
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Email</span>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </label>
      <FormError error={error} />
      <Submit pending={pending}>Send reset link</Submit>
      <Link href="/sign-in" className="text-center text-sm font-bold underline">Back to sign in</Link>
    </form>
  );
}

export function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(params.get("error") ? authErrorMessage({ code: "INVALID_TOKEN" }) : null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (!token && !error) return <FormError error={authErrorMessage({ code: "INVALID_TOKEN" })} />;
  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl bg-paprika p-4 font-bold">Password updated. You&apos;ve been signed out everywhere for safety.</p>
        <Link href="/sign-in" className="inline-flex h-12 items-center justify-center rounded-full bg-bonnet font-bold">Sign in</Link>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setPwError(null);
        if (password.length < PASSWORD_MIN) return setPwError(PASSWORD_TOO_WEAK);
        start(async () => {
          const { error } = await authClient.resetPassword({ newPassword: password, token: token ?? "" });
          if (error) {
            if (error.code === "PASSWORD_TOO_SHORT") setPwError(PASSWORD_TOO_WEAK);
            else setError(authErrorMessage(error));
          } else setDone(true);
        });
      }}
    >
      <PasswordField label="New password" value={password} onChange={setPassword} meter autoComplete="new-password" error={pwError} />
      <FormError error={error} />
      <Submit pending={pending}>Update password</Submit>
    </form>
  );
}
