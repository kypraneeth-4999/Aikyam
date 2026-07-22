import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

interface TicketTierDraft {
  id: number
  name: string
  price: string
  capacity: string
  description: string
}

interface ArtistDraft {
  id: number
  name: string
  role: string
}

interface FormState {
  title: string
  category: string
  city: string
  state: string
  venue: string
  address: string
  startDate: string
  endDate: string
  time: string
  duration: string
  language: string
  description: string
  about: string
  coverImage: string
  artists: ArtistDraft[]
  isFree: boolean
  tiers: TicketTierDraft[]
  capacity: string
}

const CATEGORIES = ["Music", "Dance", "Theatre", "Folk", "Film", "Literature", "Craft", "Food", "Heritage"]
const STATES = ["Andhra Pradesh", "Assam", "Bihar", "Delhi", "Goa", "Gujarat", "Haryana", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"]

const STEPS = [
  { number: 1, label: "Basic Info", icon: "◈" },
  { number: 2, label: "Details", icon: "◆" },
  { number: 3, label: "Tickets", icon: "⬡" },
  { number: 4, label: "Review", icon: "✦" },
]

const EMPTY_FORM: FormState = {
  title: "",
  category: "",
  city: "",
  state: "",
  venue: "",
  address: "",
  startDate: "",
  endDate: "",
  time: "",
  duration: "",
  language: "",
  description: "",
  about: "",
  coverImage: "",
  artists: [{ id: 1, name: "", role: "" }],
  isFree: false,
  tiers: [{ id: 1, name: "General", price: "", capacity: "", description: "" }],
  capacity: "",
}

export default function OrganizerCreateEvent() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [published, setPublished] = useState(false)
  const navigate = useNavigate()

  const set = (field: keyof FormState, value: any) => setForm((prev) => ({ ...prev, [field]: value }))

  const addArtist = () =>
    set("artists", [...form.artists, { id: Date.now(), name: "", role: "" }])
  const removeArtist = (id: number) =>
    set("artists", form.artists.filter((a) => a.id !== id))
  const updateArtist = (id: number, field: "name" | "role", value: string) =>
    set("artists", form.artists.map((a) => (a.id === id ? { ...a, [field]: value } : a)))

  const addTier = () =>
    set("tiers", [...form.tiers, { id: Date.now(), name: "", price: "", capacity: "", description: "" }])
  const removeTier = (id: number) =>
    set("tiers", form.tiers.filter((t) => t.id !== id))
  const updateTier = (id: number, field: keyof Omit<TicketTierDraft, "id">, value: string) =>
    set("tiers", form.tiers.map((t) => (t.id === id ? { ...t, [field]: value } : t)))

  const canProceed = () => {
    if (step === 1) return form.title && form.category && form.city && form.venue && form.startDate
    if (step === 2) return form.description
    if (step === 3) return form.isFree || form.tiers.every((t) => t.name && t.capacity)
    return true
  }

  const handlePublish = () => {
    setPublished(true)
    setTimeout(() => navigate("/organizer/dashboard"), 2000)
  }

  if (published) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-gold text-3xl animate-bounce">
          ✦
        </div>
        <h2 className="font-display text-4xl text-cream">Event Published!</h2>
        <p className="text-muted text-sm max-w-sm">
          <strong className="text-cream">{form.title || "Your event"}</strong> is now live on Utsav. Redirecting to your dashboard…
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-cream mb-1">Create Event</h1>
          <p className="text-muted text-sm">Step {step} of {STEPS.length} — {STEPS[step - 1].label}</p>
        </div>
        <Link to="/organizer/dashboard" className="text-muted text-sm hover:text-cream transition-colors">
          ← Dashboard
        </Link>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.number} className="flex items-center flex-1">
            <button
              onClick={() => s.number < step && setStep(s.number)}
              disabled={s.number > step}
              className="flex flex-col items-center gap-1.5 flex-1"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                  s.number < step
                    ? "bg-gold text-ink"
                    : s.number === step
                    ? "bg-gold/20 border-2 border-gold text-gold"
                    : "bg-surface border border-border text-muted"
                }`}
              >
                {s.number < step ? "✓" : s.icon}
              </div>
              <span className={`text-xs ${s.number === step ? "text-gold" : "text-muted"}`}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mb-5 mx-1 ${step > s.number ? "bg-gold" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form area */}
      <div className="bg-surface border border-border rounded-2xl p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl text-cream">Basic Information</h2>
            <Field label="Event Title *">
              <input
                type="text"
                placeholder="e.g. Saptak Music Festival 2027"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category *">
                <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Language">
                <input type="text" placeholder="e.g. Hindi, Carnatic, English" value={form.language} onChange={(e) => set("language", e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="City *">
                <input type="text" placeholder="e.g. Ahmedabad" value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
              </Field>
              <Field label="State">
                <select value={form.state} onChange={(e) => set("state", e.target.value)} className={inputCls}>
                  <option value="">Select state</option>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Venue Name *">
              <input type="text" placeholder="e.g. Tagore Hall" value={form.venue} onChange={(e) => set("venue", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Full Address">
              <input type="text" placeholder="Street, area, city, pincode" value={form.address} onChange={(e) => set("address", e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date *">
                <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={inputCls} />
              </Field>
              <Field label="End Date">
                <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Time">
                <input type="text" placeholder="e.g. 7:00 PM onwards" value={form.time} onChange={(e) => set("time", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Duration">
                <input type="text" placeholder="e.g. 3 hours" value={form.duration} onChange={(e) => set("duration", e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl text-cream">Event Details</h2>
            <Field label="Short Description *" hint="Appears in search results and event cards (max 200 chars)">
              <textarea
                rows={3}
                placeholder="A brief, compelling description of the event…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={200}
                className={inputCls + " resize-none"}
              />
              <p className="text-muted text-xs mt-1 text-right">{form.description.length}/200</p>
            </Field>
            <Field label="Full About Text" hint="The detailed event description shown on the event page">
              <textarea
                rows={6}
                placeholder="Tell the full story of your event — its history, significance, what audiences can expect…"
                value={form.about}
                onChange={(e) => set("about", e.target.value)}
                className={inputCls + " resize-none"}
              />
            </Field>
            <Field label="Cover Image URL" hint="A high-resolution image from Unsplash or your own CDN">
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={form.coverImage}
                onChange={(e) => set("coverImage", e.target.value)}
                className={inputCls}
              />
              {form.coverImage && (
                <div className="mt-2 h-32 rounded-xl overflow-hidden bg-surface2">
                  <img src={form.coverImage} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                </div>
              )}
            </Field>

            {/* Artists */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-cream text-sm font-medium">Artists / Performers</label>
                <button onClick={addArtist} className="text-gold text-xs hover:text-saffron transition-colors">+ Add Artist</button>
              </div>
              <div className="space-y-3">
                {form.artists.map((artist) => (
                  <div key={artist.id} className="flex gap-3 items-start">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Artist name"
                        value={artist.name}
                        onChange={(e) => updateArtist(artist.id, "name", e.target.value)}
                        className={inputCls}
                      />
                      <input
                        type="text"
                        placeholder="Role (e.g. Tabla, Kathak)"
                        value={artist.role}
                        onChange={(e) => updateArtist(artist.id, "role", e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    {form.artists.length > 1 && (
                      <button onClick={() => removeArtist(artist.id)} className="text-muted hover:text-crimson transition-colors mt-3 text-sm">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl text-cream">Tickets & Pricing</h2>

            {/* Free toggle */}
            <div className="flex items-center gap-3 bg-surface2 border border-border rounded-xl p-4">
              <button
                onClick={() => set("isFree", !form.isFree)}
                className={`w-11 h-6 rounded-full transition-all relative ${form.isFree ? "bg-gold" : "bg-border"}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form.isFree ? "left-6" : "left-1"}`} />
              </button>
              <div>
                <p className="text-cream text-sm font-medium">Free event</p>
                <p className="text-muted text-xs">Attendees register without paying</p>
              </div>
            </div>

            {!form.isFree && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-cream text-sm font-medium">Ticket Tiers</label>
                  <button onClick={addTier} className="text-gold text-xs hover:text-saffron transition-colors">+ Add Tier</button>
                </div>
                <div className="space-y-4">
                  {form.tiers.map((tier) => (
                    <div key={tier.id} className="bg-surface2 border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-cream text-xs font-semibold">Tier</p>
                        {form.tiers.length > 1 && (
                          <button onClick={() => removeTier(tier.id)} className="text-muted hover:text-crimson transition-colors text-xs">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Tier name (e.g. Stalls)" value={tier.name} onChange={(e) => updateTier(tier.id, "name", e.target.value)} className={inputCls} />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₹</span>
                          <input type="number" placeholder="Price (0 = free)" value={tier.price} onChange={(e) => updateTier(tier.id, "price", e.target.value)} className={inputCls + " pl-7"} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" placeholder="Capacity" value={tier.capacity} onChange={(e) => updateTier(tier.id, "capacity", e.target.value)} className={inputCls} />
                        <input type="text" placeholder="Short description" value={tier.description} onChange={(e) => updateTier(tier.id, "description", e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.isFree && (
              <Field label="Total Capacity">
                <input type="number" placeholder="e.g. 500" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} className={inputCls} />
              </Field>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl text-cream">Review & Publish</h2>
            <div className="bg-surface2 border border-border rounded-xl p-6 space-y-4">
              <ReviewRow label="Title" value={form.title || "—"} />
              <ReviewRow label="Category" value={form.category || "—"} />
              <ReviewRow label="Dates" value={[form.startDate, form.endDate].filter(Boolean).join(" – ") || "—"} />
              <ReviewRow label="Venue" value={[form.venue, form.city].filter(Boolean).join(", ") || "—"} />
              <ReviewRow label="Language" value={form.language || "—"} />
              <ReviewRow label="Artists" value={form.artists.filter((a) => a.name).map((a) => a.name).join(", ") || "—"} />
              <ReviewRow
                label="Tickets"
                value={
                  form.isFree
                    ? "Free entry"
                    : form.tiers.filter((t) => t.name).map((t) => `${t.name} ₹${t.price || 0}`).join(", ") || "—"
                }
              />
            </div>
            {form.coverImage && (
              <div className="h-44 rounded-xl overflow-hidden bg-surface2">
                <img src={form.coverImage} alt="Event cover" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 flex gap-3 items-start">
              <span className="text-gold text-sm shrink-0">✦</span>
              <p className="text-cream/80 text-xs leading-relaxed">
                Your event will be live immediately after publishing. You can edit details, pause ticket sales, or unpublish from your dashboard at any time.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          className={`border border-border text-muted px-6 py-3 rounded-xl text-sm hover:text-cream hover:border-gold/30 transition-all ${step === 1 ? "opacity-30 pointer-events-none" : ""}`}
        >
          ← Back
        </button>
        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="bg-gold text-ink font-semibold px-7 py-3 rounded-xl text-sm hover:bg-saffron transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={handlePublish}
            className="bg-gold text-ink font-semibold px-7 py-3 rounded-xl text-sm hover:bg-saffron transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Publish Event ✦
          </button>
        )}
      </div>
    </div>
  )
}

const inputCls =
  "w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-sm text-cream placeholder:text-muted focus:outline-none focus:border-gold/40 transition-colors"

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-cream text-sm font-medium block mb-1.5">{label}</label>
      {hint && <p className="text-muted text-xs mb-2">{hint}</p>}
      {children}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-muted text-xs w-20 shrink-0 pt-0.5">{label}</span>
      <span className="text-cream text-sm">{value}</span>
    </div>
  )
}
