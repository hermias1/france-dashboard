import { useApi } from '../hooks/useApi'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

interface ImmobilierItem {
  code_departement: string
  nom_departement: string
  prix_m2_moyen: number
  nb_mutations: number
}

export default function ImmobilierSection() {
  const { data, isLoading, error } = useApi<ImmobilierItem[]>(
    'immobilier',
    '/immobilier/departements?annee=2024'
  )

  if (isLoading) return <div className="text-gray-400 py-8">Chargement...</div>
  if (error || !data) return <div className="text-red-500 py-8">Erreur de chargement</div>

  const top10 = data.slice(0, 10).map(d => ({
    ...d,
    prix: d.prix_m2_moyen,
  }))

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-1">
        Immobilier — Prix au m² (2024)
      </h2>
      <p className="text-xs text-gray-400 mb-4">Top 10 départements les plus chers</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={top10} layout="vertical" margin={{ left: 130 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}k€`}
          />
          <YAxis
            type="category"
            dataKey="nom_departement"
            width={120}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(v: number) => [`${v.toLocaleString('fr-FR')} €/m²`, 'Prix moyen']}
          />
          <Bar dataKey="prix" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}
