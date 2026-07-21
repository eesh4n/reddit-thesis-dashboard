"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-accent to-[#1d6fe0] font-display text-base font-bold text-[#ffffff] shadow-[0_6px_16px_-6px_var(--color-accent)]">
            ◆
          </div>
          <div className="text-left">
            <div className="font-display text-[15px] font-semibold tracking-wide">Sentiment Desk</div>
            <div className="text-[10.5px] uppercase tracking-[0.16em] text-faint">Reddit alpha</div>
          </div>
        </div>

        <div className="rounded-2xl border border-edge bg-panel p-7 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <CheckCircle2 size={28} className="text-bull" />
              <h1 className="font-display text-lg font-semibold tracking-tight">Check your email</h1>
              <p className="text-[13px] text-mute">
                If an account exists for <span className="font-mono text-fg">{email}</span>, a reset link is on
                its way. It expires in 1 hour.
              </p>
            </div>
          ) : (
            <>
              <h1 className="mb-1 font-display text-xl font-semibold tracking-tight">Reset your password</h1>
              <p className="mb-6 text-[13px] text-mute">
                Enter your account email and we&apos;ll send a link to reset your password.
              </p>
              <form
                className="flex flex-col gap-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPending(true);
                  try {
                    await fetch("/api/forgot-password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                  } finally {
                    setPending(false);
                    setSent(true); // always show success — never reveal whether the email exists
                  }
                }}
              >
                <label className="flex flex-col gap-1.5 text-[12.5px] text-mute">
                  Email
                  <div className="relative">
                    <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="w-full rounded-lg border border-edge bg-panel-2 py-2.5 pl-9 pr-3.5 font-mono text-[13px] text-fg placeholder:text-faint focus:border-accent focus:outline-none"
                      placeholder="you@example.com"
                    />
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className="mt-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-[#ffffff] transition-[filter] duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Sending…" : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-[13px] text-mute">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-accent transition-colors hover:brightness-110">
            <ArrowLeft size={13} /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
