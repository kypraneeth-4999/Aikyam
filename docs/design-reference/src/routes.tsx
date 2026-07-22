import { createBrowserRouter } from 'react-router'
import RootLayout from './layouts/RootLayout'
import OrganizerLayout from './layouts/OrganizerLayout'
import Home from './pages/Home'
import EventDetail from './pages/EventDetail'
import OrganizerLanding from './pages/OrganizerLanding'
import OrganizerDashboard from './pages/OrganizerDashboard'
import OrganizerCreateEvent from './pages/OrganizerCreateEvent'

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { path: '/', Component: Home },
      { path: '/events/:id', Component: EventDetail },
      { path: '/organizer', Component: OrganizerLanding },
    ],
  },
  {
    Component: OrganizerLayout,
    children: [
      { path: '/organizer/dashboard', Component: OrganizerDashboard },
      { path: '/organizer/events', Component: OrganizerDashboard },
      { path: '/organizer/analytics', Component: OrganizerDashboard },
      { path: '/organizer/settings', Component: OrganizerDashboard },
      { path: '/organizer/events/new', Component: OrganizerCreateEvent },
    ],
  },
])
