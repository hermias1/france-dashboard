import PageHeader from '../components/layout/PageHeader'
import { useApi } from '../hooks/useApi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface BrevetDept {
  code_departement: string
  nom_departement: string
  taux_reussite: number
  inscrits: number
  admis: number
}

export default function Education() {
  const { data, isLoading } = useApi<BrevetDept[]>('brevet', '/education/brevet')

  const sorted = data ? [...data].sort((a, b) => a.taux_reussite - b.taux_reussite).slice(0, 10) : []

  return (
    <div>
      <PageHeader
        title="Éducation"
        description="Résultats du diplôme national du brevet par département"
      />

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
          10 départements avec le plus faible taux de réussite au Brevet
        </h2>
        {isLoading ? (
          <div className="text-gray-400 py-8 text-center text-sm">Chargement...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={sorted} layout="vertical" margin={{ left: 140 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="nom_departement" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Taux de réussite']} />
              <Bar dataKey="taux_reussite" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
