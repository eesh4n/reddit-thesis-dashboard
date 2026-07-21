"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { LogIn, UserPlus, AlertCircle, ArrowRight } from "lucide-react";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  // Only accept a same-origin path (starts with "/", not "//" which the
  // browser treats as protocol-relative). Otherwise `from` is attacker-
  // controlled input — "/login?from=https://evil.com" would open-redirect
  // a freshly authenticated user straight off the site.
  const rawFrom = params.get("from");
  const from = rawFrom && rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [guestPending, setGuestPending] = useState(false);

  async function handleGuest() {
    setError(null);
    setGuestPending(true);
    try {
      await fetch("/api/guest", { method: "POST" });
      router.push(from);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setGuestPending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.");
          setPending(false);
          return;
        }
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Incorrect email or password.");
        setPending(false);
        return;
      }
      router.push(from);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setPending(false);
    }
  }

  const isLogin = mode === "login";

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
          <h1 className="mb-1 font-display text-xl font-semibold tracking-tight">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mb-6 text-[13px] text-mute">
            {isLogin ? "Sign in to see your holdings and watchlist." : "Track your holdings and watchlist across sessions."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-[12.5px] text-mute">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="rounded-lg border border-edge bg-panel-2 px-3.5 py-2.5 font-mono text-[13px] text-fg placeholder:text-faint focus:border-accent focus:outline-none"
                placeholder="you@example.com"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12.5px] text-mute">
              <span className="flex items-center justify-between">
                Password
                {isLogin && (
                  <Link href="/forgot-password" className="text-[11.5px] font-normal text-faint transition-colors hover:text-accent">
                    Forgot password?
                  </Link>
                )}
              </span>
              <input
                type="password"
                required
                minLength={isLogin ? undefined : 8}
                maxLength={isLogin ? undefined : 72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="rounded-lg border border-edge bg-panel-2 px-3.5 py-2.5 font-mono text-[13px] text-fg placeholder:text-faint focus:border-accent focus:outline-none"
                placeholder={isLogin ? "••••••••" : "At least 8 characters"}
              />
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
              className="mt-1 inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-[#ffffff] transition-[filter] duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLogin ? <LogIn size={15} /> : <UserPlus size={15} />}
              {pending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
            </button>
          </form>

          {isLogin && (
            <>
              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-faint">
                <span className="h-px flex-1 bg-edge-soft" />
                or
                <span className="h-px flex-1 bg-edge-soft" />
              </div>

              <button
                type="button"
                onClick={handleGuest}
                disabled={guestPending}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-edge bg-panel-2 px-4 py-2.5 text-[13.5px] font-semibold text-mute transition-colors duration-150 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowRight size={15} />
                {guestPending ? "Please wait…" : "Continue as guest"}
              </button>
              <p className="mt-2.5 text-center text-[11.5px] text-faint">
                No account — holdings and watchlist stay on this device only.
              </p>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-[13px] text-mute">
          {isLogin ? (
            <>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-accent transition-colors hover:brightness-110">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="text-accent transition-colors hover:brightness-110">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
