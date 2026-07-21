import { Resend } from "resend";

// Lazily constructed — RESEND_API_KEY isn't required at import time (build,
// tests), only when an email actually needs to go out.
function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set — password reset emails can't be sent.");
  return new Resend(key);
}

// Resend's shared sandbox domain works with zero setup but only delivers to
// the account owner's own inbox — fine for one real user, swap for a
// verified domain's address once this needs to reach anyone else.
const FROM = process.env.RESEND_FROM_EMAIL ?? "Sentiment Desk <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await client().emails.send({
    from: FROM,
    to,
    subject: "Reset your Sentiment Desk password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="margin-bottom: 4px;">Reset your password</h2>
        <p style="color: #555;">Someone requested a password reset for this email on Sentiment Desk. If that wasn't you, you can ignore this — your password won't change.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; margin-top: 12px; padding: 10px 20px; background: #d4a017; color: #1a1204; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Reset password
          </a>
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">This link expires in 1 hour. If the button doesn't work, copy this URL: ${resetUrl}</p>
      </div>
    `,
  });
}
