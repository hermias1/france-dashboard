import { useMemo, useState } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { useApi } from '../hooks/useApi'
import type { ElectionResult } from '../lib/api'

const NUANCE_COLORS: Record<string, { base: string; light: string; label: string }> = {
  LRN: { base: '#1a2a5e', light: '#8b9fd4', label: 'RN' },
  LENS: { base: '#f5a623', light: '#fbd38d', label: 'Renaissance' },
  LFI: { base: '#c9302c', light: '#f5a3a0', label: 'LFI' },
  LVEC: { base: '#2d8f47', light: '#a3d9b0', label: 'Écologie' },
  LLR: { base: '#0072bc', light: '#7fbfea', label: 'LR' },
  LUG: { base: '#e91e63', light: '#f8a4c1', label: 'PS/PP' },
  LREC: { base: '#5c2d91', light: '#b89fd4', label: 'Reconquête' },
  LCOM: { base: '#dd1111', light: '#f09090', label: 'PCF' },
}

function interpolateColor(light: string, base: string, pct: number): string {
  // pct from 0 to 1 (0=light, 1=dark)
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
  const l = parse(light)
  const b = parse(base)
  const mix = l.map((lv, i) => Math.round(lv + (b[i] - lv) * pct))
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`
}

interface DeptResult {
  code: string
  winner: string
  pct: number
  nom: string
}

export default function ElectionMap() {
  const [tooltip, setTooltip] = useState<DeptResult | null>(null)

  const { data } = useApi<ElectionResult[]>(
    'elections-dept-map',
    '/elections/resultats?scrutin=europeennes-2024&niveau=departement'
  )

  const deptResults = useMemo(() => {
    if (!data) return new Map<string, DeptResult>()
    const grouped = new Map<string, ElectionResult[]>()
    data.forEach((r) => {
      const list = grouped.get(r.code_geo) ?? []
      list.push(r)
      grouped.set(r.code_geo, list)
    })
    const results = new Map<string, DeptResult>()
    grouped.forEach((list, code) => {
      const winner = list.reduce((a, b) => (a.voix > b.voix ? a : b))
      results.set(code, {
        code,
        winner: winner.nuance,
        pct: winner.pct_voix_exprimes,
        nom: winner.libelle_geo,
      })
    })
    return results
  }, [data])

  // Find min/max pct for scaling
  const allPcts = [...deptResults.values()].map(d => d.pct)
  const minPct = Math.min(...(allPcts.length ? allPcts : [0]))
  const maxPct = Math.max(...(allPcts.length ? allPcts : [1]))

  // Legend: unique parties that won
  const uniqueParties = [...new Set([...deptResults.values()].map(d => d.winner))]

  return (
    <div>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ center: [2.5, 46.5], scale: 2800 }}
        width={600}
        height={550}
      >
        <Geographies geography="/france-departements.json">
          {({ geographies }) =>
            geographies.map((geo) => {
              const code = geo.properties.code
              const dept = deptResults.get(code)
              let fill = '#e5e7eb'
              if (dept) {
                const colors = NUANCE_COLORS[dept.winner] ?? { base: '#666', light: '#ccc' }
                const intensity = maxPct > minPct
                  ? (dept.pct - minPct) / (maxPct - minPct)
                  : 0.5
                fill = interpolateColor(colors.light, colors.base, intensity)
              }
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={0.5}
                  onMouseEnter={() => dept && setTooltip(dept)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    hover: { strokeWidth: 1.5, stroke: '#333', outline: 'none' },
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-xs absolute -mt-16 ml-4 pointer-events-none z-10">
          <div className="font-semibold text-gray-800">{tooltip.nom}</div>
          <div className="text-gray-500">
            {NUANCE_COLORS[tooltip.winner]?.label ?? tooltip.winner} — {tooltip.pct.toFixed(1)}%
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {uniqueParties.map(nuance => {
          const colors = NUANCE_COLORS[nuance]
          if (!colors) return null
          return (
            <div key={nuance} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ background: colors.base }}
              />
              {colors.label}
            </div>
          )
        })}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-2">
          clair = score faible · foncé = score élevé
        </div>
      </div>
    </div>
  )
}
