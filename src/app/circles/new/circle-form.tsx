"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTERESTS, PRIVACY_LABELS, type CirclePrivacy } from "@/lib/circles";

const input =
  "mt-1 w-full rounded-xl border border-border bg-surface2 px-3 py-2.5 text-cream placeholder:text-muted outline-none focus:border-gold/40 transition-colors";
const label = "block text-sm font-medium text-cream";

export function CircleForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [interest, setInterest] = useState("");
  const [city, setCity] = useState("");
  const [privacy, setPrivacy] = useState<CirclePrivacy>("approval");
  const [sponsors, setSponsors] = useState(0);
  const [maxMembers, setMaxMembers] = useState("");
  const [guidelines, setGuidelines] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const nameError = name.trim().length > 0 && name.trim().length < 3
    ? "At least 3 characters."
    : null;
  const canSubmit = name.trim().length >= 3 && !busy;

  async function submit() {
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tagline,
          description,
          interest,
          city,
          privacy,
          sponsors_required: sponsors,
          max_members: maxMembers ? Number(maxMembers) : null,
          guidelines,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErrors(d.errors ?? [d.error ?? "Something went wrong."]);
        setBusy(false);
        return;
      }
      router.push(`/circles/${d.slug}`);
      router.refresh();
    } catch {
      setErrors(["Network error. Please try again."]);
      setBusy(false);
    }
  }

  const chip = (on: boolean) =>
    `rounded-full border px-3 py-2 text-sm transition-colors ${
      on ? "border-gold bg-gold/15 text-gold" : "border-border bg-surface2 text-muted hover:text-cream"
    }`;

  return (
    <div className="mt-8 space-y-6">
      <div>
        <label className={label}>Circle name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Pune Founders Table"
          className={input}
        />
        {nameError && <p className="mt-1 text-xs text-crimson">{nameError}</p>}
      </div>

      <div>
        <label className={label}>One line about it</label>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={140}
          placeholder="Twelve founders, dinner on the first Thursday."
          className={input}
        />
      </div>

      <div>
        <label className={label}>Interest</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTERESTS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterest(interest === i ? "" : i)}
              className={chip(interest === i)}
            >
              {i}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>City</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          maxLength={100}
          placeholder="Pune"
          className={input}
        />
      </div>

      <div>
        <label className={label}>What is this circle for?</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Who it's for, what you do together, how often you meet."
          className={input}
        />
      </div>

      <div>
        <label className={label}>Who can join?</label>
        <div className="mt-2 space-y-2">
          {(Object.keys(PRIVACY_LABELS) as CirclePrivacy[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrivacy(p)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                privacy === p
                  ? "border-gold bg-gold/10"
                  : "border-border bg-surface2 hover:border-gold/30"
              }`}
            >
              <span
                className={`block text-sm font-medium ${privacy === p ? "text-gold" : "text-cream"}`}
              >
                {PRIVACY_LABELS[p].label}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {PRIVACY_LABELS[p].hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      {privacy !== "open" && (
        <div>
          <label className={label}>Endorsements required</label>
          <p className="mt-0.5 text-xs text-muted">
            How many existing members must vouch for someone before you can approve
            them. Zero means your judgement alone.
          </p>
          <div className="mt-2 flex gap-2">
            {[0, 1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSponsors(n)}
                className={`flex-1 ${chip(sponsors === n)}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={label}>Member limit</label>
        <p className="mt-0.5 text-xs text-muted">
          Optional. Small circles stay close — many work best under 20.
        </p>
        <input
          type="number"
          inputMode="numeric"
          value={maxMembers}
          onChange={(e) => setMaxMembers(e.target.value)}
          min={2}
          placeholder="12"
          className={input}
        />
      </div>

      <div>
        <label className={label}>Guidelines</label>
        <p className="mt-0.5 text-xs text-muted">
          Shown to people before they apply — the norms that keep it healthy.
        </p>
        <textarea
          value={guidelines}
          onChange={(e) => setGuidelines(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Come on time. What's said here stays here. Miss two in a row and you make space for someone else."
          className={input}
        />
      </div>

      {errors.length > 0 && (
        <ul className="list-inside list-disc rounded-xl border border-crimson/30 bg-crimson/10 p-3 text-sm text-crimson">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-onaccent transition-colors hover:bg-saffron disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create circle"}
      </button>
    </div>
  );
}
