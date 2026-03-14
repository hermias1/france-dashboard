import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import KPIBar from './components/KPIBar'
import ElectionsSection from './components/ElectionsSection'
import EnergieSection from './components/EnergieSection'
import QuestionBar from './components/QuestionBar'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#fafafa]">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">État de la France</h1>
          <KPIBar />
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <QuestionBar />
          <ElectionsSection />
          <EnergieSection />
          <footer className="text-center text-xs text-gray-400 mt-12 pb-8">
            Données issues de data.gouv.fr — Projet open source
          </footer>
        </main>
      </div>
    </QueryClientProvider>
  )
}
