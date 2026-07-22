import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { EVENTS, CATEGORIES, CAT_ICONS, CITIES, type Event } from '../data/events'

const STATS = [
  { value: "2,400+", label: "Events Listed" },
  { value: "28", label: "States Covered" },
  { value: "180+", label: "Art Forms" },
  { value: "94,000", label: "Tickets Sold" },
]

export default function Home() {
  const [searchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)

  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat && CATEGORIES.includes(cat)) setActiveCategory(cat)
  }, [searchParams])

  const filtered = EVENTS.filter(
    (e) =>
      (activeCategory === "All" || e.category === activeCategory) &&
      (searchQuery === "" ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.venue.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const heroEvent = EVENTS[0]

  return (
    <>
      {/* HERO */}
      <section className="relative h-[78vh] overflow-hidden">
        <div className="absolute inset-0 bg-surface2">
          <img
            src={heroEvent.img}
            alt="Saptak Music Festival — classical musicians performing"
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/65 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #F4A01C 1px, transparent 1px), linear-gradient(to bottom, #F4A01C 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="relative z-10 max-w-7xl mx-auto px-6 h-full flex flex-col justify-end pb-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-5">
              <span className="bg-gold/15 text-gold text-xs font-semibold px-3 py-1 rounded-full border border-gold/25 uppercase tracking-widest">
                ✦ Featured Event
              </span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl text-cream leading-none mb-4">
              {heroEvent.title}
            </h1>
            <p className="text-muted text-base mb-3">
              {heroEvent.date}&nbsp;&nbsp;·&nbsp;&nbsp;{heroEvent.venue}, {heroEvent.city}
            </p>
            <p className="text-cream/65 mb-8 text-sm leading-relaxed max-w-lg">
              {heroEvent.description}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                to={`/events/${heroEvent.id}`}
                className="bg-gold text-ink font-semibold px-7 py-3 rounded-full hover:bg-saffron transition-all hover:scale-105 active:scale-95"
              >
                Get Tickets — ₹{heroEvent.price}
              </Link>
              <button
                onClick={() => document.getElementById("events-section")?.scrollIntoView({ behavior: "smooth" })}
                className="border border-cream/20 text-cream px-7 py-3 rounded-full hover:bg-cream/10 transition-all"
              >
                Explore All Events
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH BAND */}
      <div className="bg-surface border-y border-border py-5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-3 items-center flex-wrap sm:flex-nowrap">
            <div className="flex-1 relative min-w-0">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gold text-xs pointer-events-none">◈</span>
              <input
                type="text"
                placeholder="Festival, concert, theatre, craft fair…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-xl pl-9 pr-4 py-3 text-sm text-cream placeholder:text-muted focus:outline-none focus:border-gold/40 transition-colors"
              />
            </div>
            <select className="bg-surface2 border border-border rounded-xl px-4 py-3 text-sm text-muted focus:outline-none focus:border-gold/40 transition-colors appearance-none cursor-pointer shrink-0">
              <option value="">All Cities</option>
              {CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
            <button className="bg-gold text-ink font-semibold px-6 py-3 rounded-xl hover:bg-saffron transition-colors whitespace-nowrap shrink-0">
              Search Events
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-14">
        {/* CATEGORY PILLS */}
        <div id="events-section" className="flex gap-2 overflow-x-auto pb-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "bg-gold text-ink shadow-[0_0_20px_rgba(244,160,28,0.35)]"
                  : "bg-surface border border-border text-muted hover:text-cream hover:border-gold/30"
              }`}
            >
              <span className="text-xs">{CAT_ICONS[cat]}</span>
              {cat}
            </button>
          ))}
        </div>

        {/* EVENTS GRID */}
        <div className="mb-7 flex items-baseline justify-between">
          <h2 className="font-display text-3xl text-cream">
            {activeCategory === "All" ? "Upcoming Events" : activeCategory}
          </h2>
          <span className="text-muted text-sm">{filtered.length} event{filtered.length !== 1 ? "s" : ""} found</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-muted">
            <p className="text-5xl mb-5 opacity-40">◎</p>
            <p className="text-base">No events found. Try a different search or category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-18">
            {filtered.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        )}

        {/* CITIES */}
        <section className="mb-18">
          <div className="flex items-baseline gap-4 mb-8">
            <h2 className="font-display text-3xl text-cream">Browse by City</h2>
            <span className="text-muted text-sm">Events across India</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {CITIES.map((city) => (
              <button
                key={city.name}
                onMouseEnter={() => setHoveredCity(city.name)}
                onMouseLeave={() => setHoveredCity(null)}
                onClick={() => setSearchQuery(city.name)}
                className="relative overflow-hidden rounded-2xl border bg-surface p-4 text-left transition-all duration-200"
                style={{
                  borderColor: hoveredCity === city.name ? city.color + "55" : "#2A2040",
                  backgroundColor: hoveredCity === city.name ? city.color + "18" : "#14102A",
                }}
              >
                <div className="w-7 h-7 rounded-full mb-3 flex items-center justify-center text-ink font-bold text-xs" style={{ backgroundColor: city.color }}>
                  {city.name[0]}
                </div>
                <p className="text-cream font-semibold text-xs mb-0.5 truncate">{city.name}</p>
                <p className="text-muted text-xs">{city.count}</p>
              </button>
            ))}
          </div>
        </section>

        {/* STATS */}
        <section className="rounded-2xl border border-border bg-surface p-8 mb-18 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle, #F4A01C 1.5px, transparent 1.5px)", backgroundSize: "30px 30px" }}
          />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-4xl text-gold mb-1">{stat.value}</p>
                <p className="text-muted text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ORGANISER CTA */}
        <section className="rounded-2xl overflow-hidden mb-4 relative">
          <div className="p-10 md:p-14" style={{ background: "linear-gradient(135deg, #1E0A00 0%, #2A0E1A 50%, #0E0A20 100%)" }}>
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: "linear-gradient(45deg, #F4A01C 1px, transparent 1px), linear-gradient(-45deg, #E8334A 1px, transparent 1px)", backgroundSize: "60px 60px" }}
            />
            <div className="relative max-w-xl">
              <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-3">For Event Organisers</p>
              <h3 className="font-display text-4xl text-cream mb-4 leading-tight">
                Bring your festival<br />to all of India
              </h3>
              <p className="text-cream/60 text-sm mb-7 leading-relaxed">
                List classical concerts, folk performances, heritage walks, and cultural workshops. Reach audiences passionate about India's living traditions.
              </p>
              <div className="flex gap-3">
                <Link to="/organizer" className="bg-gold text-ink font-semibold px-6 py-3 rounded-full hover:bg-saffron transition-all hover:scale-105 active:scale-95 text-sm">
                  Learn More
                </Link>
                <Link to="/organizer/dashboard" className="border border-cream/20 text-cream px-6 py-3 rounded-full hover:bg-cream/10 transition-all text-sm">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}

function EventCard({ event }: { event: Event }) {
  const tagStyles: Record<string, string> = {
    Free: "bg-emerald-600/75 text-white",
    Featured: "bg-gold/90 text-ink",
    Popular: "bg-crimson/80 text-white",
    New: "bg-surface2/90 text-cream border border-border",
  }

  return (
    <Link
      to={`/events/${event.id}`}
      className="group rounded-2xl overflow-hidden border border-border bg-surface block transition-all duration-300 hover:border-gold/30 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(244,160,28,0.1)]"
    >
      <div className="relative h-48 bg-surface2 overflow-hidden">
        <img src={event.img} alt={event.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
        {event.tag && (
          <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${tagStyles[event.tag] ?? "bg-surface/80 text-cream"}`}>
            {event.tag}
          </span>
        )}
        <span className="absolute top-3 right-3 bg-ink/60 backdrop-blur-sm text-cream/80 text-xs px-2.5 py-1 rounded-full border border-border">
          {event.category}
        </span>
      </div>
      <div className="p-5">
        <h3 className="text-cream font-semibold text-sm mb-1 leading-snug group-hover:text-gold transition-colors line-clamp-2">
          {event.title}
        </h3>
        <p className="text-muted text-xs mb-4 flex items-center gap-1 truncate">
          <span className="shrink-0">◎</span>
          <span className="truncate">{event.venue}, {event.city}</span>
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-gold text-xs font-medium bg-gold/10 px-2.5 py-1 rounded-full truncate">{event.date}</span>
          <span className="text-cream font-semibold text-sm shrink-0">{event.price === 0 ? "Free" : `₹${event.price}`}</span>
        </div>
      </div>
    </Link>
  )
}
