import { useMemo } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
import ElectionMap from '../components/ElectionMap'
import TopListes from '../components/TopListes'
import { useApi } from '../hooks/useApi'
import type { ElectionResult, ParticipationResult } from '../lib/api'

export default function Elections() {
  const { data: resultats } = useApi<ElectionResult[]>(
    'elections-region',
    '/elections/resultats?scrutin=europeennes-2024&niveau=region'
  )

  const { data: participation } = useApi<ParticipationResult[]>(
    'participation-region',
    '/elections/participation?scrutin=europeennes-2024&niveau=region'
  )

  const winningParty = useMemo(() => {
    if (!resultats) return null
    const byListe = new Map<string, number>()
    resultats.forEach((r) => {
      byListe.set(r.liste, (byListe.get(r.liste) ?? 0) + r.voix)
    })
    let best = { liste: '', voix: 0 }
    byListe.forEach((voix, liste) => {
      if (voix > best.voix) best = { liste, voix }
    })
    return best
  }, [resultats])

  const nationalParticipation = useMemo(() => {
    if (!participation) return null
    const totInscrits = participation.reduce((s, r) => s + r.inscrits, 0)
    const totVotants = participation.reduce((s, r) => s + r.votants, 0)
    return totInscrits > 0 ? (totVotants / totInscrits) * 100 : 0
  }, [participation])

  const sortedParticipation = useMemo(() => {
    if (!participation) return []
    return [...participation].sort((a, b) => b.taux_participation - a.taux_participation)
  }, [participation])

  const topParticipation = sortedParticipation.slice(0, 10)
  const maxPart = topParticipation.length ? topParticipation[0].taux_participation : 1

  return (
    <div>
      <PageHeader
        title="Élections"
        description="Comment la France a-t-elle voté aux européennes 2024 ?"
      />

      {nationalParticipation !== null && winningParty && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            Aux européennes 2024, le taux de participation national était de{' '}
            <strong>{nationalParticipation.toFixed(1)}%</strong>. La liste arrivée en tête
            est <strong>{winningParty.liste}</strong> avec{' '}
            <strong>{(winningParty.voix / 1_000_000).toFixed(2)} millions</strong> de voix.
          </InsightCard>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
          Résultats par département — Européennes 2024
        </h2>
        <p className="text-xs text-gray-400 mb-3">Couleur = parti gagnant · Intensité = score du vainqueur</p>
        <ElectionMap />
      </div>

      {resultats && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">Top listes — Européennes 2024</h2>
          <TopListes results={resultats} />
        </div>
      )}

      {topParticipation.length > 0 && (
        <div className="mb-6">
          <Ranking
            title="🗳️ Participation par région — Européennes 2024"
            color="bg-blue-500"
            items={topParticipation.map((r) => ({
              label: r.libelle_geo,
              value: `${r.taux_participation.toFixed(1)}%`,
              barPct: (r.taux_participation / maxPart) * 100,
            }))}
          />
        </div>
      )}
    </div>
  )
}
