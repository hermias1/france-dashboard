import { useMemo } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
import { useApi } from '../hooks/useApi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface AccidentDept {
  code_departement: string
  nom_departement: string
  nb_accidents: number
}

export default function Transport() {
  const { data, isLoading } = useApi<AccidentDept[]>('accidents', '/accidents/departements?annee=2024')

  const sorted = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.nb_accidents - a.nb_accidents)
  }, [data])

  const totalAccidents = useMemo(() => {
    return sorted.reduce((s, d) => s + d.nb_accidents, 0)
  }, [sorted])

  const top10 = sorted.slice(0, 10)
  const maxAccidents = top10.length ? top10[0].nb_accidents : 1

  return (
    <div>
      <PageHeader
        title="Transport"
        description="Où les routes sont-elles les plus dangereuses ?"
      />

      {sorted.length > 0 && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            En 2024, la France a enregistré <strong>{totalAccidents.toLocaleString('fr-FR')}</strong> accidents
            corporels de la route. Le département le plus touché est{' '}
            <strong>{sorted[0].nom_departement}</strong> avec{' '}
            <strong>{sorted[0].nb_accidents.toLocaleString('fr-FR')}</strong> accidents.
          </InsightCard>
        </div>
      )}

      {top10.length > 0 && (
        <div className="mb-6">
          <Ranking
            title="⚠️ Top 10 — Départements les plus accidentogènes"
            color="bg-red-500"
            items={top10.map((d) => ({
              label: d.nom_departement,
              value: d.nb_accidents.toLocaleString('fr-FR'),
              barPct: (d.nb_accidents / maxAccidents) * 100,
            }))}
          />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
          Accidents de la route par département (2024)
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
