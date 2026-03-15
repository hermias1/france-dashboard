import PageHeader from '../components/layout/PageHeader'
import { useApi } from '../hooks/useApi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface FibreDept {
  code_departement: string
  nom_departement: string
  taux_couverture_moyen: number
  nb_communes: number
}

export default function Numerique() {
  const { data, isLoading } = useApi<FibreDept[]>('fibre', '/fibre/departements')

  const bottom10 = data ? [...data].sort((a, b) => a.taux_couverture_moyen - b.taux_couverture_moyen).slice(0, 10) : []

  return (
    <div>
      <PageHeader
        title="Numérique"
        description="Couverture fibre optique (FTTH) par département"
      />

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
          10 départements les moins couverts en fibre
        </h2>
        {isLoading ? (
          <div className="text-gray-400 py-8 text-center text-sm">Chargement...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={bottom10} layout="vertical" margin={{ left: 140 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="nom_departement" width={130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Couverture fibre']} />
              <Bar dataKey="taux_couverture_moyen" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
