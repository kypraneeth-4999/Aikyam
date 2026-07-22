import { useState } from 'react'
import { Link, useLocation } from 'react-router'

const MY_EVENTS = [
  {
    id: 1,
    title: "Saptak Music Festival",
    category: "Music",
    date: "Jan 4–13, 2026",
    city: "Ahmedabad",
    status: "published",
    ticketsSold: 387,
    capacity: 395,
    revenue: 312400,
    img: "https://images.unsplash.com/photo-1568219656418-15c329312bf1?w=200&h=120&fit=crop&auto=format",
  },
  {
    id: 7,
    title: "Rajasthani Folk Night at Amer",
    category: "Folk",
    date: "Mar 15, 2026",
    city: "Jaipur",
    status: "published",
    ticketsSold: 214,
    capacity: 360,
    revenue: 183800,
    img: "https://images.unsplash.com/photo-1681731030409-c4448f48a701?w=200&h=120&fit=crop&auto=format",
  },
  {
    id: 99,
    title: "Hindustani Vocal Masterclass — Summer 2026",
    category: "Music",
    date: "Jun 22, 2026",
    city: "Ahmedabad",
    status: "draft",
    ticketsSold: 0,
    capacity: 40,
    revenue: 0,
    img: "https://images.unsplash.com/photo-1568219656418-15c329312bf1?w=200&h=120&fit=crop&auto=format",
  },
  {
    id: 100,
    title: "Saptak School Annual Showcase",
    category: "Dance",
    date: "Apr 10, 2026",
    city: "Ahmedabad",
    status: "draft",
    ticketsSold: 0,
    capacity: 200,
    revenue: 0,
    img: "https://images.unsplash.com/photo-1463592177119-bab2a00f3ccb?w=200&h=120&fit=crop&auto=format",
  },
]

const RECENT_BOOKINGS = [
  { id: "BK-2814", buyer: "Rohit Sharma", event: "Saptak Music Festival", tier: "Patron Circle", qty: 2, amount: 7000, time: "2 min ago" },
  { id: "BK-2813", buyer: "Anjali Nair", event: "Saptak Music Festival", tier: "Stalls", qty: 1, amount: 1200, time: "14 min ago" },
  { id: "BK-2812", buyer: "Suresh Venkat", event: "Rajasthani Folk Night at Amer", tier: "General Seating", qty: 4, amount: 3200, time: "31 min ago" },
  { id: "BK-2811", buyer: "Meera Iyer", event: "Saptak Music Festival", tier: "Gallery", qty: 2, amount: 1000, time: "1 hr ago" },
  { id: "BK-2810", buyer: "Karan Malhotra", event: "Rajasthani Folk Night at Amer", tier: "Premium Terrace", qty: 2, amount: 4000, time: "2 hr ago" },
]

const WEEKLY_SALES = [18, 32, 27, 41, 55, 48, 63]
const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function statusBadge(status: string) {
  if (status === "published") return "bg-emerald-600/20 text-emerald-400 border-emerald-600/30"
  if (status === "draft") return "bg-surface2 text-muted border-border"
  return "bg-gold/15 text-gold border-gold/25"
}

export default function OrganizerDashboard() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<"all" | "published" | "draft">("all")

  const section =
    location.pathname === "/organizer/analytics"
      ? "Analytics"
      : location.pathname === "/organizer/settings"
      ? "Settings"
      : location.pathname === "/organizer/events"
      ? "My Events"
      : "Dashboard"

  const filteredEvents =
    activeTab === "all" ? MY_EVENTS : MY_EVENTS.filter((e) => e.status === activeTab)

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-4xl text-cream mb-1">{section}</h1>
          <p className="text-muted text-sm">Welcome back, Saptak Arts</p>
        </div>
        <Link
          to="/organizer/events/new"
          className="bg-gold text-ink font-semibold px-6 py-3 rounded-xl hover:bg-saffron transition-colors text-sm"
        >
          + Create New Event
        </Link>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Events", value: "2", change: "+1 this month", color: "#F4A01C" },
          { label: "Tickets Sold", value: "601", change: "+87 this week", color: "#1ABC9C" },
          { label: "Total Revenue", value: "₹4.96L", change: "+₹31K this week", color: "#9B59B6" },
          { label: "Page Views", value: "12,400", change: "+2,100 this week", color: "#E8334A" },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-2xl p-5">
            <p className="text-muted text-xs mb-3">{stat.label}</p>
            <p className="font-display text-3xl mb-1" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-muted text-xs">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* WEEKLY CHART */}
        <div className="bg-surface border border-border rounded-2xl p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-cream font-semibold text-sm">Ticket Sales — This Week</h2>
            <span className="text-muted text-xs">Total: {WEEKLY_SALES.reduce((a, b) => a + b, 0)} tickets</span>
          </div>
          <div className="flex items-end gap-3 h-32">
            {WEEKLY_SALES.map((val, i) => {
              const max = Math.max(...WEEKLY_SALES)
              const pct = (val / max) * 100
              const isToday = i === 6
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-muted text-xs">{val}</span>
                  <div className="w-full rounded-t-md transition-all" style={{
                    height: `${pct}%`,
                    minHeight: 4,
                    backgroundColor: isToday ? "#F4A01C" : "#2A2040",
                  }} />
                  <span className="text-muted text-xs">{WEEK_LABELS[i]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* REVENUE SPLIT */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-cream font-semibold text-sm mb-6">Revenue by Event</h2>
          <div className="space-y-4">
            {MY_EVENTS.filter((e) => e.revenue > 0).map((e) => {
              const totalRev = MY_EVENTS.reduce((a, ev) => a + ev.revenue, 0)
              const pct = Math.round((e.revenue / totalRev) * 100)
              return (
                <div key={e.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-cream text-xs truncate max-w-36">{e.title}</span>
                    <span className="text-muted text-xs shrink-0">₹{(e.revenue / 100000).toFixed(1)}L</span>
                  </div>
                  <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* EVENTS TABLE */}
      <div className="bg-surface border border-border rounded-2xl mb-8 overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-cream font-semibold text-sm">My Events</h2>
          <div className="flex gap-1 bg-surface2 p-1 rounded-xl border border-border">
            {(["all", "published", "draft"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  activeTab === tab ? "bg-gold text-ink" : "text-muted hover:text-cream"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Event", "Status", "Date", "City", "Tickets", "Revenue", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-muted text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event, i) => (
                <tr key={event.id} className={`border-b border-border last:border-0 hover:bg-surface2/50 transition-colors`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface2 shrink-0">
                        <img src={event.img} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-cream text-xs font-medium truncate max-w-40">{event.title}</p>
                        <p className="text-muted text-xs">{event.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full border capitalize ${statusBadge(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted text-xs whitespace-nowrap">{event.date}</td>
                  <td className="px-5 py-4 text-muted text-xs">{event.city}</td>
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-cream text-xs">{event.ticketsSold} / {event.capacity}</p>
                      <div className="h-1 bg-surface2 rounded-full mt-1 w-20">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(event.ticketsSold / event.capacity) * 100}%`,
                            backgroundColor: event.ticketsSold / event.capacity > 0.8 ? "#E8334A" : "#F4A01C",
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-cream text-xs font-medium">
                    {event.revenue > 0 ? `₹${(event.revenue / 100000).toFixed(1)}L` : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Link to={`/events/${event.id}`} className="text-muted text-xs hover:text-gold transition-colors">View</Link>
                      <Link to="/organizer/events/new" className="text-muted text-xs hover:text-gold transition-colors">Edit</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT BOOKINGS */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-cream font-semibold text-sm">Recent Bookings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Booking ID", "Buyer", "Event", "Tier", "Qty", "Amount", "Time"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-muted text-xs font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECENT_BOOKINGS.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface2/50 transition-colors">
                  <td className="px-5 py-4 text-gold text-xs font-mono">{b.id}</td>
                  <td className="px-5 py-4 text-cream text-xs">{b.buyer}</td>
                  <td className="px-5 py-4 text-muted text-xs truncate max-w-36">{b.event}</td>
                  <td className="px-5 py-4 text-muted text-xs">{b.tier}</td>
                  <td className="px-5 py-4 text-cream text-xs">{b.qty}</td>
                  <td className="px-5 py-4 text-cream text-xs font-medium">₹{b.amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-muted text-xs">{b.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
