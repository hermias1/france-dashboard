import { useIsMobile } from '../hooks/useIsMobile'
import { useMemo } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
import DataSource from '../components/shared/DataSource'
import { useApi } from '../hooks/useApi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface AplByDept {
  code_departement: string
  nom_departement: string
  apl_moyen: number
  nb_communes: number
  population: number
}

export default function Sante() {
  const isMobile = useIsMobile()
  const { data, isLoading } = useApi<AplByDept[]>('medecins', '/sante/medecins')

  const sortedAsc = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => a.apl_moyen - b.apl_moyen)
  }, [data])

  const sortedDesc = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.apl_moyen - a.apl_moyen)
  }, [data])

  const top10Best = sortedDesc.slice(0, 10)
  const top10Worst = sortedAsc.slice(0, 10)

  const maxBest = top10Best.length ? top10Best[0].apl_moyen : 1
  const maxWorst = top10Worst.length ? top10Worst[top10Worst.length - 1].apl_moyen : 1

  return (
    <div>
      <PageHeader
        title="Santé"
        description="Votre département est-il un désert médical ?"
      />

      {sortedAsc.length > 0 && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            <strong>{sortedAsc[0].nom_departement}</strong> a le plus faible accès aux
            médecins généralistes avec un APL de <strong>{sortedAsc[0].apl_moyen}</strong>,
            tandis que <strong>{sortedDesc[0].nom_departement}</strong> bénéficie du
            meilleur accès avec un APL de <strong>{sortedDesc[0].apl_moyen}</strong>.
            L'APL mesure le nombre de consultations de médecins généralistes accessibles
            pour 100 000 habitants. Plus il est bas, plus l'accès aux soins est difficile.
          </InsightCard>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {top10Best.length > 0 && (
          <Ranking
            title="🏥 Top 10 — Meilleur accès aux médecins"
            color="bg-green-500"
            items={top10Best.map((d) => ({
              label: d.nom_departement,
              value: `${d.apl_moyen}`,
              barPct: (d.apl_moyen / maxBest) * 100,
            }))}
          />
        )}
        {top10Worst.length > 0 && (
          <Ranking
            title="🏜️ Top 10 — Déserts médicaux"
            color="bg-red-500"
            items={top10Worst.map((d) => ({
              label: d.nom_departement,
              value: `${d.apl_moyen}`,
              barPct: (d.apl_moyen / maxWorst) * 100,
            }))}
          />
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
          Départements avec le plus faible accès aux médecins généralistes
        </h2>
        {isLoading ? (
          <div className="text-gray-400 py-8 text-center text-sm">Chargement...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={top10Worst} layout="vertical" margin={{ left: isMobile ? 80 : 140 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nom_departement" width={isMobile ? 70 : 130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v}`, 'APL médecins']} />
              <Bar dataKey="apl_moyen" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <DataSource sources={[{label: "DREES — APL Médecins généralistes", url: "https://www.data.gouv.fr/datasets/laccessibilite-potentielle-localisee-apl"}]} />
    </div>
  )
}
