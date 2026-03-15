import { useIsMobile } from '../hooks/useIsMobile'
import { useMemo } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
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
  const isMobile = useIsMobile()
  const { data, isLoading } = useApi<BrevetDept[]>('brevet', '/education/brevet')

  const sortedAsc = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => a.taux_reussite - b.taux_reussite)
  }, [data])

  const sortedDesc = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.taux_reussite - a.taux_reussite)
  }, [data])

  const nationalAvg = useMemo(() => {
    if (!data || data.length === 0) return 0
    const totalInscrits = data.reduce((s, d) => s + d.inscrits, 0)
    const totalAdmis = data.reduce((s, d) => s + d.admis, 0)
    return totalInscrits > 0 ? (totalAdmis / totalInscrits) * 100 : 0
  }, [data])

  const top10Best = sortedDesc.slice(0, 10)
  const top10Worst = sortedAsc.slice(0, 10)

  const maxBest = top10Best.length ? top10Best[0].taux_reussite : 1
  const maxWorst = top10Worst.length ? top10Worst[top10Worst.length - 1].taux_reussite : 1

  return (
    <div>
      <PageHeader
        title="Éducation"
        description="Où les élèves réussissent-ils le mieux au brevet ?"
      />

      {sortedDesc.length > 0 && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            La moyenne nationale de réussite au brevet est de{' '}
            <strong>{nationalAvg.toFixed(1)}%</strong>.{' '}
            <strong>{sortedDesc[0].nom_departement}</strong> affiche le meilleur taux avec{' '}
            <strong>{sortedDesc[0].taux_reussite.toFixed(1)}%</strong>, tandis que{' '}
            <strong>{sortedAsc[0].nom_departement}</strong> est en dernière position à{' '}
            <strong>{sortedAsc[0].taux_reussite.toFixed(1)}%</strong>.
          </InsightCard>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {top10Best.length > 0 && (
          <Ranking
            title="🎓 Top 10 — Meilleurs taux de réussite"
            color="bg-green-500"
            items={top10Best.map((d) => ({
              label: d.nom_departement,
              value: `${d.taux_reussite.toFixed(1)}%`,
              barPct: (d.taux_reussite / maxBest) * 100,
            }))}
          />
        )}
        {top10Worst.length > 0 && (
          <Ranking
            title="📉 Top 10 — Plus faibles taux de réussite"
            color="bg-red-500"
            items={top10Worst.map((d) => ({
              label: d.nom_departement,
              value: `${d.taux_reussite.toFixed(1)}%`,
              barPct: (d.taux_reussite / maxWorst) * 100,
            }))}
          />
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
          Taux de réussite au brevet par département
        </h2>
        {isLoading ? (
          <div className="text-gray-400 py-8 text-center text-sm">Chargement...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={top10Worst} layout="vertical" margin={{ left: isMobile ? 80 : 140 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="nom_departement" width={isMobile ? 70 : 130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Taux de réussite']} />
              <Bar dataKey="taux_reussite" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
