import { useMemo } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
import ImmobilierSection from '../components/ImmobilierSection'
import CorrelationScatter from '../components/CorrelationScatter'
import { useApi } from '../hooks/useApi'
import type { ImmobilierItem } from '../lib/api'

export default function Economie() {
  const { data } = useApi<ImmobilierItem[]>('immobilier-dept', '/immobilier/departements?annee=2024')

  const sorted = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.prix_m2_moyen - a.prix_m2_moyen)
  }, [data])

  const mostExpensive = sorted.slice(0, 10)
  const cheapest = [...sorted].reverse().slice(0, 10)

  const maxExpensive = mostExpensive.length ? mostExpensive[0].prix_m2_moyen : 1
  const maxCheap = cheapest.length ? cheapest[0].prix_m2_moyen : 1

  const paris = sorted.find((d) => d.nom_departement === 'Paris')
  const cheapestDept = sorted.length ? sorted[sorted.length - 1] : null

  return (
    <div>
      <PageHeader
        title="Économie"
        description="Où la vie est-elle la plus chère en France ?"
      />

      {paris && cheapestDept && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            Le prix moyen au m² à <strong>Paris</strong> est de{' '}
            <strong>{paris.prix_m2_moyen.toLocaleString('fr-FR')} €</strong>, contre seulement{' '}
            <strong>{cheapestDept.prix_m2_moyen.toLocaleString('fr-FR')} €</strong> dans{' '}
            <strong>{cheapestDept.nom_departement}</strong> — un écart de{' '}
            <strong>{(paris.prix_m2_moyen / cheapestDept.prix_m2_moyen).toFixed(1)}x</strong>.
          </InsightCard>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {mostExpensive.length > 0 && (
          <Ranking
            title="🏷️ Top 10 — Départements les plus chers"
            color="bg-red-500"
            items={mostExpensive.map((d) => ({
              label: d.nom_departement,
              value: `${d.prix_m2_moyen.toLocaleString('fr-FR')} €/m²`,
              barPct: (d.prix_m2_moyen / maxExpensive) * 100,
            }))}
          />
        )}
        {cheapest.length > 0 && (
          <Ranking
            title="💰 Top 10 — Départements les moins chers"
            color="bg-green-500"
            items={cheapest.map((d) => ({
              label: d.nom_departement,
              value: `${d.prix_m2_moyen.toLocaleString('fr-FR')} €/m²`,
              barPct: (d.prix_m2_moyen / maxCheap) * 100,
            }))}
          />
        )}
      </div>

      <ImmobilierSection />
      <div className="mt-6">
        <CorrelationScatter />
      </div>
    </div>
  )
}
