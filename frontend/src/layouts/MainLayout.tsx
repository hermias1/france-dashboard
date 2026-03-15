import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import NLQPanel from '../components/layout/NLQPanel'

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Close sidebar on navigation (mobile)
  const handleNav = () => setSidebarOpen(false)

  return (
    <div className="flex min-h-screen bg-[var(--surface-primary)]">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 bg-[#0a0a1a] text-white w-10 h-10 rounded-lg flex items-center justify-center shadow-lg"
        aria-label="Menu"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar - hidden on mobile unless open */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onNavigate={handleNav} />
      </div>

      {/* Overlay when sidebar is open on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto w-full" key={location.pathname}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pt-14 lg:pt-6">
          <Outlet />
        </div>
      </main>

      <NLQPanel />
    </div>
  )
}
