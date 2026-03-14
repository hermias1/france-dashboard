import { useApi } from '../hooks/useApi'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

interface DelinquanceItem {
  code_departement: string
  nom_departement: string
  indicateur: string
  nombre: number
  taux_pour_mille: number
  population: number
}

export default function DelinquanceSection() {
  const { data, isLoading, error } = useApi<DelinquanceItem[]>(
    'delinquance',
    '/delinquance/departements?annee=2024&indicateur=Cambriolages de logement'
  )

  if (isLoading) return <div className="text-gray-400 py-8">Chargement...</div>
  if (error || !data) return <div className="text-red-500 py-8">Erreur de chargement</div>

  const top10 = data.slice(0, 10).map(d => ({
    ...d,
    taux: +(d.taux_pour_mille).toFixed(2),
  }))

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-1">
        Sécurité — Cambriolages de logement (2024)
      </h2>
      <p className="text-xs text-gray-400 mb-4">Top 10 départements par taux pour 1 000 habitants</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={top10} layout="vertical" margin={{ left: 130 }}>
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="nom_departement"
            width={120}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(v: number) => [`${v}‰`, 'Taux pour mille']}
            labelFormatter={(label: string) => label}
          />
          <Bar dataKey="taux" fill="#dc2626" radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}
