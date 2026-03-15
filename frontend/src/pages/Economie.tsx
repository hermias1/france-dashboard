import { useMemo, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
import CorrelationScatter from '../components/CorrelationScatter'
import DataSource from '../components/shared/DataSource'
import { useApi } from '../hooks/useApi'
import type { ImmobilierItem } from '../lib/api'

interface LoyerDept {
  code_departement: string
  nom_departement: string
  loyer_m2_moyen: number
}

type Tab = 'achat' | 'location'

export default function Economie() {
  const [tab, setTab] = useState<Tab>('achat')

  const { data: immoData } = useApi<ImmobilierItem[]>('immobilier-dept', '/immobilier/departements?annee=2024')
  const { data: loyerData } = useApi<LoyerDept[]>('loyers-dept', '/loyers/departements')

  const data = tab === 'achat' ? immoData : loyerData
  const unit = tab === 'achat' ? '€/m²' : '€/m²/mois'
  const getValue = (d: ImmobilierItem | LoyerDept) =>
    'prix_m2_moyen' in d ? d.prix_m2_moyen : d.loyer_m2_moyen

  const sorted = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => getValue(b) - getValue(a))
  }, [data, tab])

  const mostExpensive = sorted.slice(0, 10)
  const cheapest = [...sorted].reverse().slice(0, 10)
  const maxExp = mostExpensive.length ? getValue(mostExpensive[0]) : 1
  const maxCheap = cheapest.length ? getValue(cheapest[0]) : 1

  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  return (
    <div>
      <PageHeader
        title="Économie"
        description="Où la vie est-elle la plus chère en France ?"
      />

      {/* Tab selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('achat')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'achat'
              ? 'bg-[#000091] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🏠 Prix à l'achat
        </button>
        <button
          onClick={() => setTab('location')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'location'
              ? 'bg-[#000091] text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🔑 Loyers
        </button>
      </div>

      {first && last && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            {tab === 'achat' ? (
              <>
                Le prix moyen au m² à <strong>{first.nom_departement}</strong> est de{' '}
                <strong>{getValue(first).toLocaleString('fr-FR')} {unit}</strong>, contre seulement{' '}
                <strong>{getValue(last).toLocaleString('fr-FR')} {unit}</strong> dans{' '}
                <strong>{last.nom_departement}</strong> — un écart de{' '}
                <strong>{(getValue(first) / getValue(last)).toFixed(1)}x</strong>.
              </>
            ) : (
              <>
                Le loyer moyen à <strong>{first.nom_departement}</strong> est de{' '}
                <strong>{getValue(first).toFixed(1)} {unit}</strong>. Pour le même budget,
                vous pouvez louer <strong>{(getValue(first) / getValue(last)).toFixed(1)}x</strong> plus
                grand dans <strong>{last.nom_departement}</strong> ({getValue(last).toFixed(1)} {unit}).
              </>
            )}
          </InsightCard>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {mostExpensive.length > 0 && (
          <Ranking
            title={`🏷️ Top 10 — ${tab === 'achat' ? 'Plus chers' : 'Loyers les plus élevés'}`}
            color="bg-red-500"
            items={mostExpensive.map((d) => ({
              label: d.nom_departement,
              value: tab === 'achat'
                ? `${getValue(d).toLocaleString('fr-FR')} ${unit}`
                : `${getValue(d).toFixed(1)} ${unit}`,
              barPct: (getValue(d) / maxExp) * 100,
            }))}
          />
        )}
        {cheapest.length > 0 && (
          <Ranking
            title={`💰 Top 10 — ${tab === 'achat' ? 'Moins chers' : 'Loyers les plus bas'}`}
            color="bg-green-500"
            items={cheapest.map((d) => ({
              label: d.nom_departement,
              value: tab === 'achat'
                ? `${getValue(d).toLocaleString('fr-FR')} ${unit}`
                : `${getValue(d).toFixed(1)} ${unit}`,
              barPct: (getValue(d) / maxCheap) * 100,
            }))}
          />
        )}
      </div>

      <CorrelationScatter />

      <DataSource sources={[{label: "DVF — data.gouv.fr", url: "https://www.data.gouv.fr/datasets/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2024"}, {label: "Loyers — Min. Transition écologique"}]} />
    </div>
  )
}
