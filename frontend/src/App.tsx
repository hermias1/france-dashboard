import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import Elections from './pages/Elections'
import Economie from './pages/Economie'
import Securite from './pages/Securite'
import Energie from './pages/Energie'
import Transport from './pages/Transport'
import Education from './pages/Education'
import Numerique from './pages/Numerique'
import Territoire from './pages/Territoire'
import ComingSoon from './pages/ComingSoon'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="elections" element={<Elections />} />
            <Route path="economie" element={<Economie />} />
            <Route path="securite" element={<Securite />} />
            <Route path="energie" element={<Energie />} />
            <Route path="sante" element={<ComingSoon title="Santé" description="Dépenses de santé, déserts médicaux, autonomie" />} />
            <Route path="education" element={<Education />} />
            <Route path="transport" element={<Transport />} />
            <Route path="numerique" element={<Numerique />} />
            <Route path="territoire/:code" element={<Territoire />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
