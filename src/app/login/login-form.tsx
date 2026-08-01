"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return "+" + digits;
  if (digits.length === 10) return "+91" + digits;
  return "+" + digits;
}

const input =
  "w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-cream placeholder:text-muted outline-none focus:border-gold/40 transition-colors";
const goldBtn =
  "w-full rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-onaccent transition-colors hover:bg-saffron disabled:opacity-60";

/** `initialError` carries a failure from the OAuth round-trip (see /auth/callback). */
export function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ phone: toE164(phone) });
    setLoading(false);
    if (error) setError(error.message);
    else setOtpSent(true);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      phone: toE164(phone),
      token: code,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  async function signInWithGoogle() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (error) setError(error.message);
  }

  return (
    <>
      {!otpSent ? (
        <form onSubmit={sendOtp} className="mt-8 space-y-3">
          <label className="block text-sm font-medium text-cream">Phone number</label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210"
            className={input}
          />
          <button type="submit" disabled={loading} className={goldBtn}>
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-8 space-y-3">
          <label className="block text-sm font-medium text-cream">
            Enter the code sent to {toE164(phone)}
          </label>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className={`${input} tracking-widest`}
          />
          <button type="submit" disabled={loading} className={goldBtn}>
            {loading ? "Verifying…" : "Verify & continue"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setCode("");
            }}
            className="w-full text-center text-xs text-muted underline"
          >
            Use a different number
          </button>
        </form>
      )}

      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        onClick={signInWithGoogle}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-cream transition-colors hover:border-gold/30"
      >
        Continue with Google
      </button>

      {error && (
        <p role="alert" className="mt-4 text-sm text-crimson">
          {error}
        </p>
      )}
    </>
  );
}
