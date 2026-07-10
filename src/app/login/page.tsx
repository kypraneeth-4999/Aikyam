"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Best-effort E.164 formatting; defaults a bare 10-digit number to +91 (India). */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return "+" + digits;
  if (digits.length === 10) return "+91" + digits;
  return "+" + digits;
}

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to Aikyam</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Discover and book authentic local experiences.
      </p>

      {!otpSent ? (
        <form onSubmit={sendOtp} className="mt-8 space-y-3">
          <label className="block text-sm font-medium">Phone number</label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-8 space-y-3">
          <label className="block text-sm font-medium">
            Enter the code sent to {toE164(phone)}
          </label>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm tracking-widest outline-none focus:border-black/30 dark:border-white/15"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
          >
            {loading ? "Verifying…" : "Verify & continue"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setCode("");
            }}
            className="w-full text-center text-xs text-zinc-500 underline"
          >
            Use a different number
          </button>
        </form>
      )}

      <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
        or
        <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
      </div>

      <button
        onClick={signInWithGoogle}
        className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-medium hover:bg-black/[.03] dark:border-white/15"
      >
        Continue with Google
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
