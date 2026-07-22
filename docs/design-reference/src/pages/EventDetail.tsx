import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { EVENTS, type TicketTier } from '../data/events'

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const event = EVENTS.find((e) => e.id === Number(id))
  const [selectedTier, setSelectedTier] = useState<number>(0)
  const [quantity, setQuantity] = useState(1)
  const [booked, setBooked] = useState(false)
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0)

  if (!event) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted gap-4">
        <p className="text-5xl opacity-30">◎</p>
        <p className="text-lg">Event not found.</p>
        <Link to="/" className="text-gold hover:text-saffron transition-colors text-sm">← Back to events</Link>
      </div>
    )
  }

  const tier = event.ticketTiers?.[selectedTier]
  const total = tier ? tier.price * quantity : 0
  const related = EVENTS.filter((e) => e.id !== event.id && e.category === event.category).slice(0, 3)

  return (
    <>
      {/* HERO */}
      <section className="relative h-[55vh] overflow-hidden bg-surface2">
        <img
          src={event.img}
          alt={event.title}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/50 to-transparent" />

        {/* Breadcrumb */}
        <div className="absolute top-6 left-6 flex items-center gap-2 text-sm">
          <Link to="/" className="text-muted hover:text-cream transition-colors">Events</Link>
          <span className="text-border">›</span>
          <span className="text-muted">{event.category}</span>
          <span className="text-border">›</span>
          <span className="text-cream/70 truncate max-w-48">{event.title}</span>
        </div>

        <div className="absolute bottom-8 left-6 right-6 max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <span className="inline-block bg-gold/15 text-gold text-xs font-semibold px-3 py-1 rounded-full border border-gold/25 uppercase tracking-widest mb-4">
              {event.category}
            </span>
            <h1 className="font-display text-4xl md:text-6xl text-cream leading-none mb-3">{event.title}</h1>
            <p className="text-muted text-sm flex items-center gap-3 flex-wrap">
              <span>◎ {event.venue}, {event.city}</span>
              <span className="text-border">·</span>
              <span>⬡ {event.date}</span>
              {event.time && <><span className="text-border">·</span><span>◷ {event.time}</span></>}
            </p>
          </div>
        </div>
      </section>

      {/* BODY */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* LEFT: Content */}
          <div className="lg:col-span-2 space-y-10">

            {/* Quick info pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: "◎", label: event.address || `${event.venue}, ${event.city}` },
                { icon: "⬡", label: event.date },
                event.duration && { icon: "◷", label: event.duration },
                event.language && { icon: "◆", label: event.language },
                event.organizer && { icon: "✦", label: event.organizer },
              ].filter(Boolean).map((item: any) => (
                <div key={item.label} className="flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-2 text-sm text-muted">
                  <span className="text-gold text-xs">{item.icon}</span>
                  <span className="truncate max-w-xs">{item.label}</span>
                </div>
              ))}
            </div>

            {/* About */}
            <div>
              <h2 className="font-display text-2xl text-cream mb-5">About this Event</h2>
              <div className="space-y-4">
                {(event.about || event.description).split('\n\n').map((para, i) => (
                  <p key={i} className="text-muted text-sm leading-relaxed">{para}</p>
                ))}
              </div>
            </div>

            {/* Gallery */}
            {event.gallery && event.gallery.length > 1 && (
              <div>
                <h2 className="font-display text-2xl text-cream mb-5">Gallery</h2>
                <div className="rounded-2xl overflow-hidden bg-surface2 mb-3 aspect-video">
                  <img
                    src={event.gallery[activeGalleryIdx]}
                    alt={`${event.title} — photo ${activeGalleryIdx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  {event.gallery.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveGalleryIdx(i)}
                      className={`h-16 w-24 rounded-lg overflow-hidden border-2 transition-all ${i === activeGalleryIdx ? "border-gold" : "border-transparent opacity-50 hover:opacity-80"}`}
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Artists */}
            {event.artists && event.artists.length > 0 && (
              <div>
                <h2 className="font-display text-2xl text-cream mb-5">Artists & Performers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {event.artists.map((artist) => (
                    <div key={artist.name} className="bg-surface border border-border rounded-2xl p-5 flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold text-sm shrink-0">
                        {artist.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-cream font-semibold text-sm mb-0.5">{artist.name}</p>
                        <p className="text-gold text-xs mb-2">{artist.role}</p>
                        <p className="text-muted text-xs leading-relaxed line-clamp-3">{artist.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Ticket box (sticky) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <p className="text-muted text-xs uppercase tracking-widest mb-1">Select Tickets</p>
                <p className="font-display text-2xl text-cream">{event.title}</p>
              </div>

              <div className="p-6 space-y-3">
                {(event.ticketTiers ?? [{ name: "General", price: event.price, description: "General admission", available: 200 }]).map((tier, i) => (
                  <TierCard
                    key={tier.name}
                    tier={tier}
                    selected={selectedTier === i}
                    onSelect={() => setSelectedTier(i)}
                  />
                ))}
              </div>

              <div className="px-6 pb-4 flex items-center gap-4">
                <div className="flex items-center gap-3 bg-surface2 border border-border rounded-xl px-4 py-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="text-muted hover:text-cream transition-colors text-lg w-5 text-center"
                  >
                    −
                  </button>
                  <span className="text-cream text-sm w-4 text-center font-semibold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="text-muted hover:text-cream transition-colors text-lg w-5 text-center"
                  >
                    +
                  </button>
                </div>
                <p className="text-muted text-xs">max 10 per booking</p>
              </div>

              <div className="px-6 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-muted text-sm">Total</span>
                  <span className="font-display text-2xl text-gold">
                    {total === 0 ? "Free" : `₹${total.toLocaleString('en-IN')}`}
                  </span>
                </div>
                <button
                  onClick={() => setBooked(true)}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                    booked
                      ? "bg-emerald-600/30 text-emerald-400 border border-emerald-600/40 cursor-default"
                      : "bg-gold text-ink hover:bg-saffron hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                >
                  {booked ? "✓ Booking Confirmed!" : total === 0 ? "Register Free" : "Book Tickets"}
                </button>
                {!booked && (
                  <p className="text-muted text-xs text-center mt-3">No payment until checkout · Secure</p>
                )}
              </div>

              {/* Organiser */}
              {event.organizer && (
                <div className="px-6 py-4 border-t border-border">
                  <p className="text-muted text-xs mb-1">Organised by</p>
                  <p className="text-cream text-sm font-medium">{event.organizer}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RELATED EVENTS */}
        {related.length > 0 && (
          <div className="mt-16 pt-10 border-t border-border">
            <h2 className="font-display text-3xl text-cream mb-8">More {event.category} Events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {related.map((e) => (
                <Link
                  key={e.id}
                  to={`/events/${e.id}`}
                  className="group rounded-2xl overflow-hidden border border-border bg-surface block transition-all hover:border-gold/30 hover:-translate-y-1"
                >
                  <div className="relative h-40 bg-surface2 overflow-hidden">
                    <img src={e.img} alt={e.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                  </div>
                  <div className="p-4">
                    <p className="text-cream font-semibold text-sm mb-1 group-hover:text-gold transition-colors line-clamp-2">{e.title}</p>
                    <p className="text-muted text-xs mb-3 truncate">◎ {e.city}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gold text-xs bg-gold/10 px-2 py-0.5 rounded-full truncate">{e.date}</span>
                      <span className="text-cream text-sm font-semibold shrink-0">{e.price === 0 ? "Free" : `₹${e.price}`}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function TierCard({ tier, selected, onSelect }: { tier: TicketTier; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? "border-gold bg-gold/10"
          : "border-border bg-surface2 hover:border-gold/30"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`font-semibold text-sm mb-0.5 ${selected ? "text-gold" : "text-cream"}`}>{tier.name}</p>
          <p className="text-muted text-xs leading-relaxed">{tier.description}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-display text-lg ${selected ? "text-gold" : "text-cream"}`}>
            {tier.price === 0 ? "Free" : `₹${tier.price}`}
          </p>
          <p className="text-muted text-xs">{tier.available} left</p>
        </div>
      </div>
      {selected && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-gold flex items-center justify-center text-ink text-xs">✓</span>
          <span className="text-gold text-xs">Selected</span>
        </div>
      )}
    </button>
  )
}
