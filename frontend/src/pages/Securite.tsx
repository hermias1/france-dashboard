import { useMemo } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
import DelinquanceSection from '../components/DelinquanceSection'
import { useApi } from '../hooks/useApi'
import type { DelinquanceItem } from '../lib/api'

export default function Securite() {
  const { data } = useApi<DelinquanceItem[]>(
    'delinquance',
    '/delinquance/departements?annee=2024&indicateur=Cambriolages de logement'
  )

  const sorted = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => a.taux_pour_mille - b.taux_pour_mille)
  }, [data])

  const safest = sorted.slice(0, 10)
  const leastSafe = [...sorted].reverse().slice(0, 10)

  const maxSafe = safest.length ? safest[safest.length - 1].taux_pour_mille : 1
  const maxUnsafe = leastSafe.length ? leastSafe[0].taux_pour_mille : 1

  return (
    <div>
      <PageHeader
        title="Sécurité"
        description="Quels sont les départements les plus sûrs de France ?"
      />

      {sorted.length > 0 && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            En 2024, <strong>{sorted[0].nom_departement}</strong> est le département le plus sûr
            de France avec seulement <strong>{sorted[0].taux_pour_mille.toFixed(2)}‰</strong> de
            cambriolages pour mille habitants, tandis que{' '}
            <strong>{sorted[sorted.length - 1].nom_departement}</strong> affiche le taux le plus
            élevé à <strong>{sorted[sorted.length - 1].taux_pour_mille.toFixed(2)}‰</strong> —
            soit {(sorted[sorted.length - 1].taux_pour_mille / sorted[0].taux_pour_mille).toFixed(1)}x plus.
          </InsightCard>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {safest.length > 0 && (
          <Ranking
            title="🛡️ Top 10 — Départements les plus sûrs"
            color="bg-green-500"
            items={safest.map((d) => ({
              label: d.nom_departement,
              value: `${d.taux_pour_mille.toFixed(2)}‰`,
              barPct: (d.taux_pour_mille / maxSafe) * 100,
            }))}
          />
        )}
        {leastSafe.length > 0 && (
          <Ranking
            title="⚠️ Top 10 — Départements les moins sûrs"
            color="bg-red-500"
            items={leastSafe.map((d) => ({
              label: d.nom_departement,
              value: `${d.taux_pour_mille.toFixed(2)}‰`,
              barPct: (d.taux_pour_mille / maxUnsafe) * 100,
            }))}
          />
        )}
      </div>

      <DelinquanceSection />
    </div>
  )
}
