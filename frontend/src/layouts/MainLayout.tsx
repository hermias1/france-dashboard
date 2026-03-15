import { Outlet } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import NLQPanel from '../components/layout/NLQPanel'

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-[#f8f8f8]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
      <NLQPanel />
    </div>
  )
}
