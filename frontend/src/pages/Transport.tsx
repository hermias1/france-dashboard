import PageHeader from '../components/layout/PageHeader'
import { useApi } from '../hooks/useApi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface AccidentDept {
  code_departement: string
  nom_departement: string
  nb_accidents: number
}

export default function Transport() {
  const { data, isLoading } = useApi<AccidentDept[]>('accidents', '/accidents/departements?annee=2024')

  const top10 = data?.slice(0, 10) ?? []

  return (
    <div>
      <PageHeader
        title="Transport"
        description="Accidents corporels de la circulation routière — données 2024"
      />

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
          Top 10 départements — Accidents de la route (2024)
        </h2>
        {isLoading ? (
          <div className="text-gray-400 py-8 text-center text-sm">Chargement...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={top10} layout="vertical" margin={{ left: 140 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nom_departement" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [v.toLocaleString('fr-FR'), 'Accidents']} />
              <Bar dataKey="nb_accidents" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
