interface RankingItem {
  label: string
  value: string
  barPct: number
}

interface Props {
  title: string
  items: RankingItem[]
  color?: string
}

export default function Ranking({ title, items, color = 'bg-blue-500' }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-5 text-right font-mono">{i + 1}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-800">{item.label}</span>
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${item.barPct}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
