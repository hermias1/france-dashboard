import { useApi } from '../hooks/useApi'
import type { ElectionResult } from '../lib/api'
import FranceMap from './FranceMap'
import TopListes from './TopListes'

export default function ElectionsSection() {
  const { data, isLoading, error } = useApi<ElectionResult[]>(
    'elections-region',
    '/elections/resultats?scrutin=europeennes-2024&niveau=region'
  )

  if (isLoading) return <div className="text-gray-400 py-8">Chargement...</div>
  if (error || !data) return <div className="text-red-500 py-8">Erreur de chargement</div>

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
        Élections européennes 2024
      </h2>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/2">
          <FranceMap results={data} />
        </div>
        <div className="lg:w-1/2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Top 5 listes (voix)</h3>
          <TopListes results={data} />
        </div>
      </div>
    </section>
  )
}
