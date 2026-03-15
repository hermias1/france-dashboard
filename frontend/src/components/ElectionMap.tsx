import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { useApi } from '../hooks/useApi'
import type { ElectionResult, ParticipationResult } from '../lib/api'

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

type ViewMode =
  | 'winner'
  | 'LRN'
  | 'LENS'
  | 'LFI'
  | 'LVEC'
  | 'LLR'
  | 'LUG'
  | 'abstention'

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'winner', label: 'Parti gagnant' },
  { value: 'LRN', label: 'Score RN (%)' },
  { value: 'LENS', label: 'Score Renaissance (%)' },
  { value: 'LFI', label: 'Score LFI (%)' },
  { value: 'LVEC', label: 'Score Écologie (%)' },
  { value: 'LLR', label: 'Score LR (%)' },
  { value: 'LUG', label: 'Score PS/PP (%)' },
  { value: 'abstention', label: 'Abstention (%)' },
]

const PARTY_GRADIENT_COLORS: Record<string, string> = {
  LRN: '#1a2a5e',
  LENS: '#f5a623',
  LFI: '#c9302c',
  LVEC: '#2d8f47',
  LLR: '#0072bc',
  LUG: '#e91e63',
  abstention: '#6b7280',
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

interface DeptScore {
  code: string
  nom: string
  score: number
}

export default function ElectionMap() {
  const [tooltip, setTooltip] = useState<DeptResult | DeptScore | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('winner')
  const navigate = useNavigate()

  const { data } = useApi<ElectionResult[]>(
    'elections-dept-map',
    '/elections/resultats?scrutin=europeennes-2024&niveau=departement'
  )

  const { data: participationData } = useApi<ParticipationResult[]>(
    'elections-dept-participation',
    '/elections/participation?scrutin=europeennes-2024&niveau=departement'
  )

  // Group results by department
  const grouped = useMemo(() => {
    if (!data) return new Map<string, ElectionResult[]>()
    const map = new Map<string, ElectionResult[]>()
    data.forEach((r) => {
      const list = map.get(r.code_geo) ?? []
      list.push(r)
      map.set(r.code_geo, list)
    })
    return map
  }, [data])

  // Winner mode data
  const deptResults = useMemo(() => {
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
  }, [grouped])

  // Party score mode data
  const deptScores = useMemo(() => {
    if (viewMode === 'winner') return new Map<string, DeptScore>()
    if (viewMode === 'abstention') {
      if (!participationData) return new Map<string, DeptScore>()
      const results = new Map<string, DeptScore>()
      participationData.forEach((p) => {
        const abstention = p.inscrits > 0 ? 100 - (p.votants / p.inscrits * 100) : 0
        results.set(p.code_geo, {
          code: p.code_geo,
          nom: p.libelle_geo,
          score: abstention,
        })
      })
      return results
    }
    // Party score
    const results = new Map<string, DeptScore>()
    grouped.forEach((list, code) => {
      const match = list.find((r) => r.nuance === viewMode)
      const nom = list[0]?.libelle_geo ?? code
      results.set(code, {
        code,
        nom,
        score: match?.pct_voix_exprimes ?? 0,
      })
    })
    return results
  }, [viewMode, grouped, participationData])

  // Compute min/max for current view
  const { minVal, maxVal } = useMemo(() => {
    if (viewMode === 'winner') {
      const allPcts = [...deptResults.values()].map((d) => d.pct)
      return {
        minVal: Math.min(...(allPcts.length ? allPcts : [0])),
        maxVal: Math.max(...(allPcts.length ? allPcts : [1])),
      }
    }
    const allScores = [...deptScores.values()].map((d) => d.score)
    return {
      minVal: Math.min(...(allScores.length ? allScores : [0])),
      maxVal: Math.max(...(allScores.length ? allScores : [1])),
    }
  }, [viewMode, deptResults, deptScores])

  // Legend: unique parties that won (winner mode only)
  const uniqueParties = useMemo(
    () => [...new Set([...deptResults.values()].map((d) => d.winner))],
    [deptResults]
  )

  const isPartyMode = viewMode !== 'winner'
  const gradientColor = isPartyMode ? PARTY_GRADIENT_COLORS[viewMode] ?? '#666' : ''
  const modeLabel = VIEW_OPTIONS.find((o) => o.value === viewMode)?.label ?? ''

  return (
    <div>
      {/* Dropdown selector */}
      <div className="mb-3">
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2"
        >
          {VIEW_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

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
              let fill = '#e5e7eb'
              let hoverData: DeptResult | DeptScore | null = null

              if (viewMode === 'winner') {
                const dept = deptResults.get(code)
                if (dept) {
                  const colors = NUANCE_COLORS[dept.winner] ?? { base: '#666', light: '#ccc' }
                  const intensity =
                    maxVal > minVal ? (dept.pct - minVal) / (maxVal - minVal) : 0.5
                  fill = interpolateColor(colors.light, colors.base, intensity)
                  hoverData = dept
                }
              } else {
                const score = deptScores.get(code)
                if (score) {
                  const intensity =
                    maxVal > minVal ? (score.score - minVal) / (maxVal - minVal) : 0.5
                  fill = interpolateColor('#ffffff', gradientColor, intensity)
                  hoverData = score
                }
              }

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={0.5}
                  onMouseEnter={() => hoverData && setTooltip(hoverData)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => navigate(`/territoire/${code}`)}
                  style={{
                    hover: { strokeWidth: 1.5, stroke: '#333', outline: 'none', cursor: 'pointer' },
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
            {viewMode === 'winner' && 'winner' in tooltip
              ? `${NUANCE_COLORS[(tooltip as DeptResult).winner]?.label ?? (tooltip as DeptResult).winner} — ${tooltip.pct.toFixed(1)}%`
              : `${modeLabel} : ${(tooltip as DeptScore).score.toFixed(1)}%`}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 justify-center">
        {viewMode === 'winner' ? (
          <>
            {uniqueParties.map((nuance) => {
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
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm" style={{ background: '#ffffff', border: '1px solid #d1d5db' }} />
            {minVal.toFixed(0)}%
            <span
              className="w-16 h-3 rounded-sm"
              style={{ background: `linear-gradient(to right, #ffffff, ${gradientColor})` }}
            />
            {maxVal.toFixed(0)}%
            <span className="w-3 h-3 rounded-sm" style={{ background: gradientColor }} />
          </div>
        )}
      </div>
    </div>
  )
}
