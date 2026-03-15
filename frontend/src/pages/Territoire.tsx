import { useParams } from 'react-router-dom'
import { useApi } from '../hooks/useApi'

interface Indicateur {
  label: string
  valeur: string
  detail?: string | null
  comparaison: string
  ecart_pct: number
  icone: string
}

interface TerritoireProfile {
  code: string
  nom: string
  type: string
  indicateurs: Indicateur[]
}

function Jauge({ ecart, comparaison, inverse }: { ecart: number; comparaison: string; inverse?: boolean }) {
  const absEcart = Math.min(Math.abs(ecart), 100)
  const isGood = inverse
    ? comparaison === 'en-dessous'
    : comparaison === 'au-dessus'
  const isBad = inverse
    ? comparaison === 'au-dessus'
    : comparaison === 'en-dessous'

  let color = 'bg-gray-400'
  let textColor = 'text-gray-600'
  let badge = '≈ moyenne'

  if (comparaison === 'au-dessus') {
    color = inverse ? 'bg-red-500' : 'bg-green-500'
    textColor = inverse ? 'text-red-600' : 'text-green-600'
    badge = `+${Math.abs(ecart).toFixed(0)}%`
  } else if (comparaison === 'en-dessous') {
    color = inverse ? 'bg-green-500' : 'bg-amber-500'
    textColor = inverse ? 'text-green-600' : 'text-amber-600'
    badge = `${ecart > 0 ? '+' : ''}${ecart.toFixed(0)}%`
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${Math.max(absEcart, 5)}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{badge}</span>
    </div>
  )
}

function IndicateurCard({ ind }: { ind: Indicateur }) {
  const inverse = ['Cambriolages', 'Accidents route'].includes(ind.label)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{ind.icone}</span>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{ind.label}</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">{ind.valeur}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">vs. moyenne nationale</span>
        <Jauge ecart={ind.ecart_pct} comparaison={ind.comparaison} inverse={inverse} />
      </div>
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

  return (
    <div>
      {/* Header */}
      <div className="bg-[#000091] text-white rounded-xl p-6 mb-6">
        <div className="text-white/60 text-sm">Département {data.code}</div>
        <h1 className="text-3xl font-bold mt-1">{data.nom}</h1>
        <p className="text-white/70 text-sm mt-2">
          Portrait du territoire — Comment se situe {data.nom} par rapport à la moyenne nationale
        </p>
      </div>

      {/* Indicateurs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {data.indicateurs.map((ind) => (
          <IndicateurCard key={ind.label} ind={ind} />
        ))}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-500">
        <div className="font-medium text-gray-700 mb-2">Comment lire ces indicateurs ?</div>
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500" /> Au-dessus de la moyenne (positif)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gray-400" /> Dans la moyenne
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" /> En-dessous de la moyenne
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" /> Attention (cambriolages, accidents)
          </span>
        </div>
      </div>
    </div>
  )
}
