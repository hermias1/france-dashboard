import PageHeader from '../components/layout/PageHeader'
import InteractiveMap from '../components/InteractiveMap'
import TopListes from '../components/TopListes'
import { useApi } from '../hooks/useApi'
import type { ElectionResult } from '../lib/api'

export default function Elections() {
  const { data } = useApi<ElectionResult[]>(
    'elections-region',
    '/elections/resultats?scrutin=europeennes-2024&niveau=region'
  )

  return (
    <div>
      <PageHeader
        title="Élections"
        description="Résultats des élections européennes 2024 et présidentielle 2022"
      />

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">Carte par département</h2>
        <InteractiveMap />
      </div>

      {data && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">Top listes — Européennes 2024</h2>
          <TopListes results={data} />
        </div>
      )}
    </div>
  )
}
