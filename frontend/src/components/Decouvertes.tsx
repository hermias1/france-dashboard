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
  const color = abs > 0.7 ? 'bg-red-100 text-red-700' : abs > 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
  const label = r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2)
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${color}`}>
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
        <span className="text-lg">💡</span>
        <h2 className="text-sm uppercase tracking-wide text-gray-500">Découvertes — Ce que les données révèlent</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.slice(0, 6).map((insight, i) => (
          <div
            key={i}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition hover:border-blue-300 group"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition leading-tight">
                {insight.title}
              </h3>
              <CorrelationBadge r={insight.correlation} />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              {insight.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
