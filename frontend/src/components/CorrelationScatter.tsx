import { useState, useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { useApi } from '../hooks/useApi'
import type {
  DelinquanceItem, ImmobilierItem, ElectionResult, ParticipationResult,
} from '../lib/api'

type IndicatorKey = 'immobilier' | 'cambriolages' | 'vote_rn' | 'participation' | 'revenu' | 'pauvrete' | 'fibre' | 'medecins' | 'brevet'

const INDICATOR_OPTIONS: { value: IndicatorKey; label: string }[] = [
  { value: 'immobilier', label: 'Prix immobilier (€/m²)' },
  { value: 'cambriolages', label: 'Cambriolages (‰)' },
  { value: 'vote_rn', label: 'Vote RN (%)' },
  { value: 'participation', label: 'Participation (%)' },
  { value: 'revenu', label: 'Revenu médian (€)' },
  { value: 'pauvrete', label: 'Taux de pauvreté (%)' },
  { value: 'fibre', label: 'Couverture fibre (%)' },
  { value: 'medecins', label: 'Accès médecins (APL)' },
  { value: 'brevet', label: 'Réussite brevet (%)' },
]

function pearson(points: { x: number; y: number }[]): number {
  const n = points.length
  if (n < 3) return NaN
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const sumY2 = points.reduce((s, p) => s + p.y * p.y, 0)
  const num = n * sumXY - sumX * sumY
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
  return den === 0 ? NaN : num / den
}

export default function CorrelationScatter() {
  const [xKey, setXKey] = useState<IndicatorKey>('immobilier')
  const [yKey, setYKey] = useState<IndicatorKey>('cambriolages')

  const { data: immoData } = useApi<ImmobilierItem[]>(
    'scatter-immobilier', '/immobilier/departements?annee=2024',
  )
  const { data: cambData } = useApi<DelinquanceItem[]>(
    'scatter-cambriolages', '/delinquance/departements?annee=2024&indicateur=Cambriolages de logement',
  )
  const { data: elecData } = useApi<ElectionResult[]>(
    'scatter-vote-rn', '/elections/resultats?scrutin=europeennes-2024&niveau=departement',
  )
  const { data: partData } = useApi<ParticipationResult[]>(
    'scatter-participation', '/elections/participation?scrutin=europeennes-2024&niveau=departement',
  )
  const { data: precData } = useApi<{ code_departement: string; nom_departement: string; revenu_median: number; taux_pauvrete: number }[]>(
    'scatter-precarite', '/precarite/departements',
  )
  const { data: fibreData } = useApi<{ code_departement: string; nom_departement: string; taux_couverture_moyen: number }[]>(
    'scatter-fibre', '/fibre/departements',
  )
  const { data: medData } = useApi<{ code_departement: string; nom_departement: string; apl_moyen: number }[]>(
    'scatter-medecins', '/sante/medecins',
  )
  const { data: brevData } = useApi<{ code_departement: string; nom_departement: string; taux_reussite: number }[]>(
    'scatter-brevet', '/education/brevet',
  )

  const datasets = useMemo(() => {
    const maps: Record<IndicatorKey, Map<string, { name: string; value: number }>> = {
      immobilier: new Map(), cambriolages: new Map(), vote_rn: new Map(),
      participation: new Map(), revenu: new Map(), pauvrete: new Map(),
      fibre: new Map(), medecins: new Map(), brevet: new Map(),
    }

    immoData?.forEach(d =>
      maps.immobilier.set(d.code_departement, { name: d.nom_departement, value: d.prix_m2_moyen }),
    )
    cambData?.forEach(d =>
      maps.cambriolages.set(d.code_departement, { name: d.nom_departement, value: d.taux_pour_mille }),
    )
    elecData?.filter(d => d.nuance === 'LRN').forEach(d =>
      maps.vote_rn.set(d.code_geo, { name: d.libelle_geo, value: d.pct_voix_exprimes }),
    )
    partData?.forEach(d =>
      maps.participation.set(d.code_geo, { name: d.libelle_geo, value: d.taux_participation }),
    )
    precData?.forEach(d => {
      if (d.revenu_median) maps.revenu.set(d.code_departement, { name: d.nom_departement, value: d.revenu_median })
      if (d.taux_pauvrete) maps.pauvrete.set(d.code_departement, { name: d.nom_departement, value: d.taux_pauvrete })
    })
    fibreData?.forEach(d =>
      maps.fibre.set(d.code_departement, { name: d.nom_departement, value: d.taux_couverture_moyen }),
    )
    medData?.forEach(d =>
      maps.medecins.set(d.code_departement, { name: d.nom_departement, value: d.apl_moyen }),
    )
    brevData?.forEach(d =>
      maps.brevet.set(d.code_departement, { name: d.nom_departement, value: d.taux_reussite }),
    )

    return maps
  }, [immoData, cambData, elecData, partData])

  const { points, r } = useMemo(() => {
    const xMap = datasets[xKey]
    const yMap = datasets[yKey]
    const pts: { x: number; y: number; name: string; code: string }[] = []

    xMap.forEach((xEntry, code) => {
      const yEntry = yMap.get(code)
      if (yEntry) {
        pts.push({ x: xEntry.value, y: yEntry.value, name: xEntry.name, code })
      }
    })

    const r = pearson(pts)
    return { points: pts, r }
  }, [datasets, xKey, yKey])

  const xLabel = INDICATOR_OPTIONS.find(o => o.value === xKey)!.label
  const yLabel = INDICATOR_OPTIONS.find(o => o.value === yKey)!.label

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-1">
        Corrélations entre indicateurs
      </h2>
      <p className="text-xs text-gray-400 mb-4">Chaque point = un département</p>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Axe X :</label>
          <select
            value={xKey}
            onChange={e => setXKey(e.target.value as IndicatorKey)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {INDICATOR_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Axe Y :</label>
          <select
            value={yKey}
            onChange={e => setYKey(e.target.value as IndicatorKey)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {INDICATOR_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {!isNaN(r) && (
          <span className="text-sm text-gray-600">
            r = <span className="font-mono font-medium">{r.toFixed(3)}</span>
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name={xLabel}
            tick={{ fontSize: 11 }}
            label={{ value: xLabel, position: 'bottom', fontSize: 11, fill: '#6b7280' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={yLabel}
            tick={{ fontSize: 11 }}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7280' }}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null
              const pt = payload[0].payload as { name: string; x: number; y: number }
              return (
                <div className="bg-white border border-gray-200 rounded px-3 py-2 shadow-sm text-sm">
                  <p className="font-medium">{pt.name}</p>
                  <p className="text-gray-500">{xLabel}: {pt.x.toLocaleString('fr-FR')}</p>
                  <p className="text-gray-500">{yLabel}: {pt.y.toLocaleString('fr-FR')}</p>
                </div>
              )
            }}
          />
          <Scatter data={points} fill="#2563eb" fillOpacity={0.7} r={4} />
        </ScatterChart>
      </ResponsiveContainer>
    </section>
  )
}
