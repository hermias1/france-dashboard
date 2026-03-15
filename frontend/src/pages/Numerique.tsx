import { useIsMobile } from '../hooks/useIsMobile'
import { useMemo } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
import { useApi } from '../hooks/useApi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface FibreDept {
  code_departement: string
  nom_departement: string
  taux_couverture_moyen: number
  nb_communes: number
}

export default function Numerique() {
  const isMobile = useIsMobile()
  const { data, isLoading } = useApi<FibreDept[]>('fibre', '/fibre/departements')

  const sortedAsc = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => a.taux_couverture_moyen - b.taux_couverture_moyen)
  }, [data])

  const sortedDesc = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.taux_couverture_moyen - a.taux_couverture_moyen)
  }, [data])

  const nationalAvg = useMemo(() => {
    if (!data || data.length === 0) return 0
    return data.reduce((s, d) => s + d.taux_couverture_moyen, 0) / data.length
  }, [data])

  const top10Best = sortedDesc.slice(0, 10)
  const top10Worst = sortedAsc.slice(0, 10)

  const maxBest = top10Best.length ? top10Best[0].taux_couverture_moyen : 1
  const maxWorst = top10Worst.length ? top10Worst[top10Worst.length - 1].taux_couverture_moyen : 1

  return (
    <div>
      <PageHeader
        title="Numérique"
        description="Votre département est-il bien connecté à la fibre ?"
      />

      {sortedDesc.length > 0 && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            En moyenne, <strong>{nationalAvg.toFixed(1)}%</strong> des communes françaises sont
            couvertes par la fibre. <strong>{sortedDesc[0].nom_departement}</strong> mène avec{' '}
            <strong>{sortedDesc[0].taux_couverture_moyen.toFixed(1)}%</strong> de couverture,
            tandis que <strong>{sortedAsc[0].nom_departement}</strong> est le moins connecté à{' '}
            <strong>{sortedAsc[0].taux_couverture_moyen.toFixed(1)}%</strong>.
          </InsightCard>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {top10Best.length > 0 && (
          <Ranking
            title="🌐 Top 10 — Meilleure couverture fibre"
            color="bg-green-500"
            items={top10Best.map((d) => ({
              label: d.nom_departement,
              value: `${d.taux_couverture_moyen.toFixed(1)}%`,
              barPct: (d.taux_couverture_moyen / maxBest) * 100,
            }))}
          />
        )}
        {top10Worst.length > 0 && (
          <Ranking
            title="📡 Top 10 — Plus faible couverture fibre"
            color="bg-red-500"
            items={top10Worst.map((d) => ({
              label: d.nom_departement,
              value: `${d.taux_couverture_moyen.toFixed(1)}%`,
              barPct: (d.taux_couverture_moyen / maxWorst) * 100,
            }))}
          />
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
          Départements les moins couverts en fibre
        </h2>
        {isLoading ? (
          <div className="text-gray-400 py-8 text-center text-sm">Chargement...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={top10Worst} layout="vertical" margin={{ left: isMobile ? 80 : 140 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="nom_departement" width={isMobile ? 70 : 130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Couverture fibre']} />
              <Bar dataKey="taux_couverture_moyen" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
