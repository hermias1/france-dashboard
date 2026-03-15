interface Props {
  icon: string
  title: string
  children: React.ReactNode
}

export default function InsightCard({ icon, title, children }: Props) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-100" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #fff7ed 100%)' }}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#000091]/[0.03] rounded-full -translate-y-16 translate-x-16" />
      <div className="relative p-5">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">{icon}</span>
          <div>
            <div className="text-[10px] font-bold text-[#000091] uppercase tracking-[0.15em] mb-1.5">{title}</div>
            <div className="text-sm text-gray-700 leading-relaxed [&>strong]:text-gray-900 [&>strong]:font-semibold">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
