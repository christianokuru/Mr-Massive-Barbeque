"use client";

import { useId, useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/validation";
import { cn } from "@/lib/utils";

export const inputClass =
  "h-12 w-full rounded-lg border border-input bg-white px-3 text-base outline-none focus:ring-3 focus:ring-ring/40 aria-[invalid=true]:border-chili";

function score(pw: string) {
  const checks = [
    { ok: pw.length >= PASSWORD_MIN, label: `At least ${PASSWORD_MIN} characters` },
    { ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), label: "Upper and lower case" },
    { ok: /\d/.test(pw), label: "A number" },
    { ok: /[^A-Za-z0-9]/.test(pw) || pw.length >= 14, label: "A symbol (or 14+ characters)" },
  ];
  return { checks, score: pw.length ? checks.filter((c) => c.ok).length : 0 };
}

const LABELS = ["", "Weak", "Fair", "Good", "Strong"];

export function PasswordField({
  label = "Password",
  value,
  onChange,
  error,
  meter = false,
  autoComplete = "current-password",
  name = "password",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  meter?: boolean;
  autoComplete?: string;
  name?: string;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  const s = score(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          maxLength={PASSWORD_MAX}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={cn(inputClass, "pr-12")}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute top-0.5 right-0.5 inline-flex size-11 items-center justify-center rounded-lg text-smoke hover:text-char"
        >
          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {meter ? (
        <div className="mt-1" aria-live="polite">
          <div className="flex gap-1.5" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  i <= s.score ? (s.score <= 1 ? "bg-chili" : s.score === 2 ? "bg-bonnet" : "bg-[#3f7a34]") : "bg-line",
                )}
              />
            ))}
          </div>
          {value ? <p className="mt-1 text-xs font-bold">{LABELS[s.score]}</p> : null}
          <ul className="mt-1 grid gap-0.5 text-xs text-muted-foreground sm:grid-cols-2">
            {s.checks.map((c) => (
              <li key={c.label} className={cn("flex items-center gap-1", c.ok && "text-[#2f6a26]")}>
                {c.ok ? <Check className="size-3.5" /> : <X className="size-3.5" />} {c.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {error ? <p id={`${id}-err`} className="text-sm font-bold text-chili" role="alert">{error}</p> : null}
    </div>
  );
}
