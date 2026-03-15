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
    <div className="bg-white rounded-xl shadow-[var(--shadow-sm)] border border-gray-100 p-5">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-4">{title}</h3>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="text-[10px] text-gray-300 w-4 text-right font-mono font-bold">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[13px] text-gray-800 truncate">{item.label}</span>
                <span className="text-[13px] font-semibold text-gray-900 ml-2 shrink-0">{item.value}</span>
              </div>
              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} transition-all duration-500`}
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
