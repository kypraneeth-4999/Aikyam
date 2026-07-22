import { Link, Outlet, useNavigate, useLocation } from 'react-router'
import { useState } from 'react'

export default function RootLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-ink text-cream font-sans">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-border bg-ink/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-10">
            <Link to="/" className="font-display text-2xl text-gold tracking-wide hover:text-saffron transition-colors">
              UTSAV
            </Link>
            <div className="hidden md:flex items-center gap-7 text-sm text-muted">
              {["Music", "Dance", "Theatre", "Folk", "Film"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => navigate(`/?category=${cat}`)}
                  className="hover:text-cream transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/organizer"
              className={`hidden sm:block text-sm transition-colors ${isHome ? 'text-muted hover:text-cream' : 'text-muted hover:text-cream'}`}
            >
              For Organisers
            </Link>
            <button className="text-sm text-muted hover:text-cream transition-colors">Sign in</button>
            <Link
              to="/organizer/dashboard"
              className="bg-gold text-ink text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-saffron transition-colors"
            >
              List Event
            </Link>
          </div>
        </div>
      </nav>

      <Outlet />

      {/* FOOTER */}
      <footer className="border-t border-border bg-surface py-14">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div>
            <Link to="/" className="font-display text-3xl text-gold block mb-3">UTSAV</Link>
            <p className="text-muted text-sm leading-relaxed max-w-xs">
              India's premier marketplace for cultural events — from Carnatic ragas and Kathak recitals to Diwali craft fairs and folk celebrations.
            </p>
          </div>
          {[
            { title: "Discover", links: [["Events", "/"], ["Organiser Portal", "/organizer"]] },
            { title: "Categories", links: [["Music", "/?category=Music"], ["Dance", "/?category=Dance"], ["Theatre", "/?category=Theatre"], ["Folk Arts", "/?category=Folk"]] },
            { title: "For Organisers", links: [["List an Event", "/organizer/dashboard"], ["Dashboard", "/organizer/dashboard"], ["Organiser Guide", "/organizer"]] },
          ].map((col) => (
            <div key={col.title}>
              <p className="text-cream font-semibold text-sm mb-5">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link to={href} className="text-muted text-sm hover:text-gold transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-6 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted text-xs">© 2026 Utsav Technologies Pvt. Ltd. · Made with love in India 🇮🇳</p>
          <div className="flex gap-5 text-muted text-xs">
            {["Privacy", "Terms", "Contact"].map((l) => (
              <a key={l} href="#" className="hover:text-gold transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
