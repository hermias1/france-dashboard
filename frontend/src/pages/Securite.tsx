import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
import DataSource from '../components/shared/DataSource'
import { useApi } from '../hooks/useApi'
import type { DelinquanceItem } from '../lib/api'

interface DelinquanceEvolution {
  annee: number
  indicateur: string
  total: number
}

const INDICATEURS = [
  'Cambriolages de logement',
  'Violences physiques hors cadre familial',
  'Violences physiques intrafamiliales',
  'Violences sexuelles',
  'Vols avec armes',
  'Vols sans violence contre des personnes',
  'Destructions et dégradations volontaires',
  'Trafic de stupéfiants',
  'Usage de stupéfiants',
  'Escroqueries et fraudes aux moyens de paiement',
  'Homicides',
] as const

export default function Securite() {
  const [indicateur, setIndicateur] = useState(INDICATEURS[0])

  const { data } = useApi<DelinquanceItem[]>(
    `delinquance-${indicateur}`,
    `/delinquance/departements?annee=2024&indicateur=${indicateur}`
  )

  const { data: evolution } = useApi<DelinquanceEvolution[]>(
    `delinquance-evolution-${indicateur}`,
    `/delinquance/evolution?indicateur=${indicateur}`
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

      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm font-medium text-gray-700">Type d'infraction :</label>
        <select
          value={indicateur}
          onChange={(e) => setIndicateur(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2"
        >
          {INDICATEURS.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

      {sorted.length > 0 && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            En 2024, <strong>{sorted[0].nom_departement}</strong> est le département le plus sûr
            de France avec seulement <strong>{sorted[0].taux_pour_mille.toFixed(2)}‰</strong> de
            {' '}{indicateur.toLowerCase()} pour mille habitants, tandis que{' '}
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

      {evolution && evolution.length > 0 && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Évolution temporelle</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolution}>
              <XAxis dataKey="annee" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString('fr-FR')} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <DataSource sources={[{label: "Ministère de l'Intérieur — data.gouv.fr", url: "https://www.data.gouv.fr/datasets/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales"}]} />
    </div>
  )
}
