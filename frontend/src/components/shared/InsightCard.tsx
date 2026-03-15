interface Props {
  icon: string
  title: string
  children: React.ReactNode
}

export default function InsightCard({ icon, title, children }: Props) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{icon}</span>
        <div>
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">{title}</div>
          <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  )
}
