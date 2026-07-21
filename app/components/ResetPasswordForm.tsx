"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const missingLink = !token || !email;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-gold to-[#b8842b] font-display text-base font-bold text-[#1a1204] shadow-[0_6px_16px_-6px_var(--color-gold)]">
            ◆
          </div>
          <div className="text-left">
            <div className="font-display text-[15px] font-semibold tracking-wide">Sentiment Desk</div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-faint">Reddit alpha</div>
          </div>
        </div>

        <div className="rounded-2xl border border-edge bg-panel p-7 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
          {missingLink ? (
            <div className="flex items-center gap-2 rounded-lg border border-bear/30 bg-bear-dim px-3 py-2.5 text-[13px] text-bear">
              <AlertCircle size={14} className="shrink-0" />
              This reset link is missing required info. Request a new one from the login page.
            </div>
          ) : done ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <CheckCircle2 size={28} className="text-bull" />
              <h1 className="font-display text-lg font-semibold tracking-tight">Password updated</h1>
              <p className="text-[13px] text-mute">You can sign in with your new password now.</p>
              <button
                onClick={() => router.push("/login")}
                className="mt-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-[13.5px] font-semibold text-[#1a1204] transition-[filter] duration-150 hover:brightness-110"
              >
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <h1 className="mb-1 font-display text-xl font-semibold tracking-tight">Set a new password</h1>
              <p className="mb-6 text-[13px] text-mute">
                Resetting for <span className="font-mono text-fg">{email}</span>.
              </p>
              <form
                className="flex flex-col gap-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setError(null);
                  if (password !== confirm) {
                    setError("Passwords don't match.");
                    return;
                  }
                  setPending(true);
                  try {
                    const res = await fetch("/api/reset-password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email, token, password }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setError(data.error ?? "Something went wrong.");
                      return;
                    }
                    setDone(true);
                  } catch {
                    setError("Something went wrong. Try again.");
                  } finally {
                    setPending(false);
                  }
                }}
              >
                <label className="flex flex-col gap-1.5 text-[12.5px] text-mute">
                  New password
                  <div className="relative">
                    <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={72}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-edge bg-panel-2 py-2.5 pl-9 pr-3.5 font-mono text-[13px] text-fg placeholder:text-faint focus:border-gold focus:outline-none"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1.5 text-[12.5px] text-mute">
                  Confirm password
                  <div className="relative">
                    <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                    <input
                      type="password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      className="w-full rounded-lg border border-edge bg-panel-2 py-2.5 pl-9 pr-3.5 font-mono text-[13px] text-fg placeholder:text-faint focus:border-gold focus:outline-none"
                      placeholder="Retype the password"
                    />
                  </div>
                </label>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-bear/30 bg-bear-dim px-3 py-2 text-[12.5px] text-bear">
                    <AlertCircle size={14} className="shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-[13.5px] font-semibold text-[#1a1204] transition-[filter] duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Reset password"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-[13px] text-mute">
          <Link href="/login" className="text-gold transition-colors hover:brightness-110">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
