import { useIsMobile } from '../hooks/useIsMobile'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ElectionResult } from '../lib/api'
import { NUANCE_COLORS } from '../lib/colors'

interface Props {
  results: ElectionResult[]
}

export default function TopListes({ results }: Props) {
  const isMobile = useIsMobile()
  const byListe = new Map<string, { liste: string; nuance: string; voix: number }>()
  results.forEach((r) => {
    const entry = byListe.get(r.liste) ?? { liste: r.liste, nuance: r.nuance, voix: 0 }
    entry.voix += r.voix
    byListe.set(r.liste, entry)
  })

  const top5 = [...byListe.values()]
    .sort((a, b) => b.voix - a.voix)
    .slice(0, 5)
    .map((d) => ({
      ...d,
      voix_millions: +(d.voix / 1_000_000).toFixed(2),
      fill: NUANCE_COLORS[d.nuance] ?? '#2563eb',
    }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={top5} layout="vertical" margin={{ left: isMobile ? 70 : 120 }}>
        <XAxis type="number" tickFormatter={(v) => `${v}M`} />
        <YAxis type="category" dataKey="liste" width={110} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => `${v}M voix`} />
        <Bar dataKey="voix_millions" radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}
