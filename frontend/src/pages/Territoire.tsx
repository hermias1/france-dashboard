import { useParams, Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

interface Indicateur {
  label: string
  valeur: string
  detail?: string | null
  comparaison: string
  ecart_pct: number
  icone: string
  score: number
}

interface TerritoireProfile {
  code: string
  nom: string
  type: string
  indicateurs: Indicateur[]
  score_global: number
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 65 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'
  const circumference = 2 * Math.PI * 40
  const offset = circumference * (1 - score / 100)

  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-gray-400">/100</span>
      </div>
    </div>
  )
}

function IndicateurCard({ ind }: { ind: Indicateur }) {
  const color = ind.score >= 65 ? 'text-green-600' : ind.score >= 45 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
      <span className="text-xl">{ind.icone}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500">{ind.label}</div>
        <div className="text-lg font-bold text-gray-900">{ind.valeur}</div>
      </div>
      <div className={`text-sm font-bold ${color}`}>{ind.score}/100</div>
    </div>
  )
}

export default function Territoire() {
  const { code } = useParams<{ code: string }>()
  const { data, isLoading, error } = useApi<TerritoireProfile>(
    `territoire-${code}`,
    `/territoire/departement/${code}`
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="inline-block w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-lg font-semibold text-gray-700">Département non trouvé</h2>
      </div>
    )
  }

  const radarData = data.indicateurs.map(ind => ({
    label: ind.label,
    score: ind.score,
    fullMark: 100,
  }))

  const scoreLabel = data.score_global >= 65
    ? 'Au-dessus de la moyenne'
    : data.score_global >= 45
    ? 'Dans la moyenne'
    : 'En-dessous de la moyenne'

  return (
    <div>
      {/* Header */}
      <div className="bg-[#000091] text-white rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white/60 text-sm">Département {data.code}</div>
            <h1 className="text-3xl font-bold mt-1">{data.nom}</h1>
            <p className="text-white/50 text-sm mt-1">{scoreLabel}</p>
          </div>
          <ScoreCircle score={data.score_global} />
        </div>
      </div>

      {/* Radar + compare link */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Profil du département</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} outerRadius={100}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke="#000091" fill="#000091" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-3">
          {data.indicateurs.map((ind) => (
            <IndicateurCard key={ind.label} ind={ind} />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          to={`/versus?left=${data.code}`}
          className="bg-[#000091] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1a1a8f] transition"
        >
          ⚔️ Comparer avec un autre département
        </Link>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-500">
        <div className="font-medium text-gray-700 mb-2">Comment lire le score ?</div>
        <p>Chaque indicateur est noté de 0 à 100 (50 = moyenne nationale). Le score global est la moyenne de tous les indicateurs. Plus le score est élevé, mieux le département se positionne.</p>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> 65+ Très bien</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> 45-64 Moyen</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> &lt;45 Attention</span>
        </div>
      </div>
    </div>
  )
}
