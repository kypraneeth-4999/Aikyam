import { Link } from 'react-router'

const FEATURES = [
  {
    icon: "◈",
    title: "Reach passionate audiences",
    body: "Utsav attracts India's most engaged cultural audience — people who travel for festivals, buy season subscriptions, and return year after year.",
  },
  {
    icon: "◎",
    title: "Simple event listing",
    body: "Create your event in minutes. Set ticket tiers, manage capacity, add artists, and go live immediately with our guided form.",
  },
  {
    icon: "▲",
    title: "Real-time analytics",
    body: "Track ticket sales, revenue, page views, and audience demographics. Know exactly how your event is performing before it happens.",
  },
  {
    icon: "✦",
    title: "Built for Indian culture",
    body: "We understand the difference between a sabha concert and a heritage walk. Our platform speaks the language of classical arts, folk traditions, and festivals.",
  },
  {
    icon: "⬡",
    title: "Free discovery listing",
    body: "Every event gets a free listing page with photos, artists, and ticket information. You only pay when tickets are sold.",
  },
  {
    icon: "◆",
    title: "Promote across India",
    body: "Your events are surfaced to relevant audiences in the right city, at the right time, filtered by category and art form — not just geography.",
  },
]

const PLANS = [
  {
    name: "Free Listing",
    price: "₹0",
    billing: "always free",
    description: "For community events, free admission performances, and small-scale happenings.",
    features: [
      "Unlimited free events",
      "Event page with photos & artists",
      "City discovery listing",
      "Basic inquiry form",
    ],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Standard",
    price: "5%",
    billing: "of ticket revenue",
    description: "For paid events and festivals that want full ticketing, analytics, and promotion.",
    features: [
      "Everything in Free",
      "Paid ticket tiers",
      "Real-time sales dashboard",
      "Audience analytics",
      "Featured placement (₹999/event)",
      "Payout within 7 days",
    ],
    cta: "Get Started",
    highlight: true,
  },
  {
    name: "Festival Partner",
    price: "Custom",
    billing: "annual partnership",
    description: "For large festivals, sabhas, and organisations running 10+ events per year.",
    features: [
      "Everything in Standard",
      "Dedicated account manager",
      "Priority homepage placement",
      "Co-branded marketing",
      "0-day payout option",
      "Custom integrations",
    ],
    cta: "Contact Us",
    highlight: false,
  },
]

const TESTIMONIALS = [
  {
    name: "Smt. Vijayalakshmi Rao",
    org: "Bharat Natyam Kendra, Chennai",
    quote: "We used to spend months on paper tickets and phone confirmations. Utsav cut our pre-event work by 80% and brought in audiences from Bengaluru and Hyderabad we had never reached before.",
  },
  {
    name: "Amir Khan",
    org: "Jodhpur RIFF Festival",
    quote: "The analytics showed us that 35% of our ticket buyers had never attended a folk music event before. That's the new audience we needed to find.",
  },
  {
    name: "Priya Mehta",
    org: "Prism Theatre Company, Delhi",
    quote: "For a theatre company with no marketing budget, Utsav's discovery algorithm did the work. Our last three productions sold out — that had never happened before.",
  },
]

export default function OrganizerLanding() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(244,160,28,0.07) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(to right, #F4A01C 1px, transparent 1px), linear-gradient(to bottom, #F4A01C 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-36 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/20 text-gold text-xs font-semibold px-3 py-1.5 rounded-full mb-7 uppercase tracking-widest">
              ✦ For Organisers & Cultural Institutions
            </div>
            <h1 className="font-display text-5xl md:text-6xl text-cream leading-none mb-6">
              Bring your festival<br />to all of India.
            </h1>
            <p className="text-muted text-base leading-relaxed mb-8 max-w-md">
              Utsav is the marketplace where India's cultural events find their audiences. From a single sabha concert to a ten-day heritage festival — we make it discoverable, bookable, and unforgettable.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Link
                to="/organizer/dashboard"
                className="bg-gold text-ink font-semibold px-7 py-3.5 rounded-full hover:bg-saffron transition-all hover:scale-105 active:scale-95"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/organizer/events/new"
                className="border border-cream/20 text-cream px-7 py-3.5 rounded-full hover:bg-cream/10 transition-all"
              >
                Create an Event
              </Link>
            </div>
          </div>

          {/* Stats card */}
          <div className="hidden md:grid grid-cols-2 gap-4">
            {[
              { value: "2,400+", label: "Events live", accent: "#F4A01C" },
              { value: "94K", label: "Tickets sold", accent: "#E8334A" },
              { value: "28", label: "States reached", accent: "#9B59B6" },
              { value: "4.8★", label: "Organiser rating", accent: "#1ABC9C" },
            ].map((s) => (
              <div key={s.label} className="bg-surface border border-border rounded-2xl p-6">
                <p className="font-display text-4xl mb-1" style={{ color: s.accent }}>{s.value}</p>
                <p className="text-muted text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-display text-4xl text-cream mb-3">Everything you need to run a cultural event</h2>
          <p className="text-muted text-sm max-w-xl mx-auto">Built specifically for classical music, dance, theatre, folk arts, film, and literary festivals — not a generic events platform.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-surface border border-border rounded-2xl p-6 hover:border-gold/25 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold mb-4">
                {f.icon}
              </div>
              <h3 className="text-cream font-semibold text-sm mb-2">{f.title}</h3>
              <p className="text-muted text-xs leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-border bg-surface py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="font-display text-4xl text-cream text-center mb-14">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="absolute top-6 left-[12.5%] right-[12.5%] h-px bg-border hidden md:block" />
            {[
              { step: "01", title: "Create your account", body: "Sign up as an organiser with your name, organisation, and a brief description of your events." },
              { step: "02", title: "List your event", body: "Use our guided form to add your event details, artists, images, and ticket tiers." },
              { step: "03", title: "Go live instantly", body: "Your event appears on Utsav's discovery pages, category feeds, and city listings immediately." },
              { step: "04", title: "Get paid", body: "Ticket revenue is transferred to your account within 7 days of the event date, with a full settlement statement." },
            ].map((s) => (
              <div key={s.step} className="relative text-center">
                <div className="w-12 h-12 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-gold font-display text-lg mx-auto mb-5 relative z-10 bg-surface">
                  {s.step}
                </div>
                <h3 className="text-cream font-semibold text-sm mb-2">{s.title}</h3>
                <p className="text-muted text-xs leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="font-display text-4xl text-cream mb-3">Simple, honest pricing</h2>
          <p className="text-muted text-sm">Free events are always free. Paid events pay a 5% commission — nothing until a ticket is sold.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-7 flex flex-col ${
                plan.highlight
                  ? "border-gold bg-gold/5 shadow-[0_0_40px_rgba(244,160,28,0.12)]"
                  : "border-border bg-surface"
              }`}
            >
              {plan.highlight && (
                <div className="inline-flex items-center gap-1.5 bg-gold/15 text-gold text-xs font-semibold px-3 py-1 rounded-full border border-gold/25 mb-4 w-fit">
                  ✦ Most Popular
                </div>
              )}
              <h3 className={`font-display text-2xl mb-1 ${plan.highlight ? "text-gold" : "text-cream"}`}>{plan.name}</h3>
              <div className="flex items-end gap-1.5 mb-1">
                <span className={`font-display text-4xl ${plan.highlight ? "text-gold" : "text-cream"}`}>{plan.price}</span>
                <span className="text-muted text-sm mb-1">{plan.billing}</span>
              </div>
              <p className="text-muted text-xs mb-6 leading-relaxed">{plan.description}</p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-cream/80">
                    <span className="text-gold shrink-0 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/organizer/dashboard"
                className={`w-full py-3 rounded-xl font-semibold text-sm text-center transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  plan.highlight
                    ? "bg-gold text-ink hover:bg-saffron"
                    : "border border-border text-cream hover:bg-surface2"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t border-border bg-surface py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="font-display text-4xl text-cream text-center mb-14">What organisers say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-surface2 border border-border rounded-2xl p-7">
                <p className="text-gold text-2xl mb-5 font-display leading-none">"</p>
                <p className="text-cream/80 text-sm leading-relaxed mb-6 italic">{t.quote}</p>
                <div>
                  <p className="text-cream font-semibold text-sm">{t.name}</p>
                  <p className="text-muted text-xs">{t.org}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-5xl text-cream mb-4">Ready to reach India?</h2>
        <p className="text-muted text-sm mb-10 max-w-md mx-auto">
          Join 600+ organisers who use Utsav to fill seats, find new audiences, and keep India's cultural calendar alive.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            to="/organizer/events/new"
            className="bg-gold text-ink font-semibold px-8 py-4 rounded-full hover:bg-saffron transition-all hover:scale-105 active:scale-95"
          >
            Create Your First Event
          </Link>
          <Link
            to="/organizer/dashboard"
            className="border border-cream/20 text-cream px-8 py-4 rounded-full hover:bg-cream/10 transition-all"
          >
            View Dashboard
          </Link>
        </div>
      </section>
    </>
  )
}
