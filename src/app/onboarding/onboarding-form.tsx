"use client";

import { useActionState } from "react";
import { saveProfile, type OnboardingState } from "./actions";

const initialState: OnboardingState = {};

export function OnboardingForm({ defaultCity = "" }: { defaultCity?: string }) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-3">
      <div>
        <label className="block text-sm font-medium">Full name</label>
        <input
          name="name"
          required
          minLength={2}
          autoComplete="name"
          placeholder="Priya Sharma"
          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">City (optional)</label>
        <input
          name="city"
          defaultValue={defaultCity}
          autoComplete="address-level2"
          placeholder="Pune"
          className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/15"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
