import { useApi } from '../hooks/useApi'

interface Insight {
  title: string
  description: string
  correlation: number
  indicator_x: string
  indicator_y: string
  icon: string
}

function CorrelationBadge({ r }: { r: number }) {
  const abs = Math.abs(r)
  const color = abs > 0.7
    ? 'bg-red-50 text-red-600 border-red-200'
    : abs > 0.5
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-blue-50 text-blue-600 border-blue-200'
  const label = r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2)
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${color}`}>
      r={label}
    </span>
  )
}

export default function Decouvertes() {
  const { data, isLoading } = useApi<Insight[]>('insights', '/insights/correlations')

  if (isLoading || !data || data.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#c9992d] to-[#f59e0b] flex items-center justify-center text-white text-xs">
          💡
        </div>
        <h2 className="text-xs uppercase tracking-[0.15em] text-gray-500 font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Découvertes — Ce que les données révèlent
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.slice(0, 6).map((insight, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 p-4 shadow-[var(--shadow-sm)] card-hover group"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-[13px] font-semibold text-gray-800 group-hover:text-[#000091] transition leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                {insight.title}
              </h3>
              <CorrelationBadge r={insight.correlation} />
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              {insight.description}
            </p>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-gray-400 mt-3 italic">
        Corrélation statistique ≠ causalité. Coefficient r de Pearson, 101 départements.
      </p>
    </div>
  )
}
