import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { useApi } from '../hooks/useApi'
import type { DelinquanceItem, ImmobilierItem, ParticipationResult } from '../lib/api'

type Indicator = 'immobilier' | 'cambriolages' | 'participation'

const INDICATORS: { value: Indicator; label: string }[] = [
  { value: 'immobilier', label: 'Prix immobilier (€/m²)' },
  { value: 'cambriolages', label: 'Cambriolages (‰)' },
  { value: 'participation', label: 'Participation électorale (%)' },
]

const API_PATHS: Record<Indicator, string> = {
  immobilier: '/immobilier/departements?annee=2024',
  cambriolages: '/delinquance/departements?annee=2024&indicateur=Cambriolages de logement',
  participation: '/elections/participation?scrutin=europeennes-2024&niveau=departement',
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function interpolateColor(low: [number, number, number], high: [number, number, number], t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  const r = Math.round(lerp(low[0], high[0], clamped))
  const g = Math.round(lerp(low[1], high[1], clamped))
  const b = Math.round(lerp(low[2], high[2], clamped))
  return `rgb(${r},${g},${b})`
}

const BLUE_LOW: [number, number, number] = [219, 234, 254]
const BLUE_HIGH: [number, number, number] = [30, 64, 175]
const RED_LOW: [number, number, number] = [254, 226, 226]
const RED_HIGH: [number, number, number] = [185, 28, 28]

export default function InteractiveMap() {
  const [indicator, setIndicator] = useState<Indicator>('immobilier')
  const navigate = useNavigate()

  const { data: immoData } = useApi<ImmobilierItem[]>('map-immobilier', API_PATHS.immobilier)
  const { data: cambData } = useApi<DelinquanceItem[]>('map-cambriolages', API_PATHS.cambriolages)
  const { data: partData } = useApi<ParticipationResult[]>('map-participation', API_PATHS.participation)

  const [hovered, setHovered] = useState<{ name: string; value: string } | null>(null)

  const { valueMap, min, max, isRed } = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>()
    let isRed = false

    if (indicator === 'immobilier' && immoData) {
      immoData.forEach(d => map.set(d.code_departement, { name: d.nom_departement, value: d.prix_m2_moyen }))
    } else if (indicator === 'cambriolages' && cambData) {
      isRed = true
      cambData.forEach(d => map.set(d.code_departement, { name: d.nom_departement, value: d.taux_pour_mille }))
    } else if (indicator === 'participation' && partData) {
      partData.forEach(d => map.set(d.code_geo, { name: d.libelle_geo, value: d.taux_participation }))
    }

    const values = Array.from(map.values()).map(v => v.value)
    const min = values.length ? Math.min(...values) : 0
    const max = values.length ? Math.max(...values) : 1
    return { valueMap: map, min, max, isRed }
  }, [indicator, immoData, cambData, partData])

  const getColor = (code: string) => {
    const entry = valueMap.get(code)
    if (!entry || max === min) return '#e5e7eb'
    const t = (entry.value - min) / (max - min)
    return isRed
      ? interpolateColor(RED_LOW, RED_HIGH, t)
      : interpolateColor(BLUE_LOW, BLUE_HIGH, t)
  }

  const formatValue = (value: number) => {
    if (indicator === 'immobilier') return `${value.toLocaleString('fr-FR')} €/m²`
    if (indicator === 'cambriolages') return `${value.toFixed(2)}‰`
    return `${value.toFixed(1)}%`
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-1">
        Carte interactive par département
      </h2>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs text-gray-400">Indicateur :</label>
        <select
          value={indicator}
          onChange={e => setIndicator(e.target.value as Indicator)}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          {INDICATORS.map(i => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
      </div>
      <div className="relative">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [2.8, 46.2], scale: 2200 }}
          width={500}
          height={500}
        >
          <Geographies geography="/france-departements.json">
            {({ geographies }) =>
              geographies.map(geo => {
                const code = geo.properties.code
                const entry = valueMap.get(code)
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(code)}
                    stroke="#fff"
                    strokeWidth={0.5}
                    onMouseEnter={() => {
                      if (entry) {
                        setHovered({ name: entry.name, value: formatValue(entry.value) })
                      } else {
                        setHovered({ name: geo.properties.nom, value: '—' })
                      }
                    }}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => navigate(`/territoire/${code}`)}
                    style={{
                      hover: { opacity: 0.8, outline: 'none', cursor: 'pointer' },
                      default: { outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>
        {hovered && (
          <div className="absolute top-2 right-2 bg-white border border-gray-200 rounded px-3 py-2 shadow-sm text-sm pointer-events-none">
            <span className="font-medium">{hovered.name}</span>
            <span className="ml-2 text-gray-600">{hovered.value}</span>
          </div>
        )}
      </div>
    </section>
  )
}
