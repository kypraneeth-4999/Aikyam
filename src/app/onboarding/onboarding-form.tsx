"use client";

import { useActionState } from "react";
import { saveProfile, type OnboardingState } from "./actions";

const initialState: OnboardingState = {};

const input =
  "mt-1 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-sm text-cream placeholder:text-muted outline-none focus:border-gold/40 transition-colors";

export function OnboardingForm({ defaultCity = "" }: { defaultCity?: string }) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-3">
      <div>
        <label className="block text-sm font-medium text-cream">Full name</label>
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
          placeholder="Priya Sharma"
          className={input}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-cream">City (optional)</label>
        <input
          name="city"
          defaultValue={defaultCity}
          maxLength={100}
          autoComplete="address-level2"
          placeholder="Pune"
          className={input}
        />
      </div>
      {state.error && <p className="text-sm text-crimson">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-onaccent transition-colors hover:bg-saffron disabled:opacity-60"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
