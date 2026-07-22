import { Link, Outlet, useLocation, useNavigate } from 'react-router'

const NAV_ITEMS = [
  { label: "Dashboard", href: "/organizer/dashboard", icon: "◈" },
  { label: "My Events", href: "/organizer/events", icon: "◎" },
  { label: "Create Event", href: "/organizer/events/new", icon: "✦" },
  { label: "Analytics", href: "/organizer/analytics", icon: "▲" },
  { label: "Settings", href: "/organizer/settings", icon: "⊙" },
]

export default function OrganizerLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-ink text-cream font-sans flex">
      {/* SIDEBAR */}
      <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col fixed top-0 left-0 h-full z-40">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-border">
          <Link to="/" className="font-display text-2xl text-gold hover:text-saffron transition-colors">
            UTSAV
          </Link>
          <p className="text-muted text-xs mt-0.5">Organiser Portal</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? "bg-gold/15 text-gold border border-gold/20"
                    : "text-muted hover:text-cream hover:bg-surface2"
                }`}
              >
                <span className="text-xs w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold text-xs font-bold">
              SA
            </div>
            <div className="min-w-0">
              <p className="text-cream text-xs font-medium truncate">Saptak Arts</p>
              <p className="text-muted text-xs truncate">saptak@example.com</p>
            </div>
          </div>
          <Link to="/" className="mt-3 flex items-center gap-2 text-muted text-xs hover:text-cream transition-colors">
            <span>←</span> Back to Utsav
          </Link>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 ml-60 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-ink/90 backdrop-blur-md border-b border-border px-8 h-14 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-4">
            <Link
              to="/organizer/events/new"
              className="bg-gold text-ink text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-saffron transition-colors"
            >
              + Create Event
            </Link>
            <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold text-xs font-bold cursor-pointer">
              SA
            </div>
          </div>
        </header>

        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
