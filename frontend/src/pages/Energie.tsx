import { useMemo, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import { useApi } from '../hooks/useApi'
import type { EnergiePoint } from '../lib/api'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from 'recharts'

type View = 'timeline' | 'comparison' | 'seasonal'

const YEAR_COLORS = ['#2563eb', '#dc2626', '#f59e0b', '#10b981', '#8b5cf6']

export default function Energie() {
  const [view, setView] = useState<View>('timeline')

  const { data } = useApi<EnergiePoint[]>(
    'energie-full',
    '/energie/consommation?date_min=2013-01-01&date_max=2025-12-31'
  )

  const peak = useMemo(() => {
    if (!data) return null
    let max: EnergiePoint | null = null
    for (const p of data) {
      if (p.pic_consommation_mw !== null && (!max || p.pic_consommation_mw > (max.pic_consommation_mw ?? 0))) {
        max = p
      }
    }
    return max
  }, [data])

  // Timeline: sampled every 7 days for 2023-2024
  const timelineData = useMemo(() => {
    if (!data) return []
    return data
      .filter(d => d.date >= '2023-01-01' && d.date <= '2024-12-31')
      .filter((_, i) => i % 7 === 0)
  }, [data])

  // Year comparison: overlay last 3 years on same month axis
  const comparisonYears = [2024, 2023, 2022]
  const comparisonData = useMemo(() => {
    if (!data) return []
    const byDayOfYear = new Map<number, Record<string, number>>()
    data.forEach(d => {
      const date = new Date(d.date)
      const year = date.getFullYear()
      if (!comparisonYears.includes(year) || !d.pic_consommation_mw) return
      const dayOfYear = Math.floor((date.getTime() - new Date(year, 0, 0).getTime()) / 86400000)
      // Group by week
      const week = Math.floor(dayOfYear / 7)
      const entry = byDayOfYear.get(week) ?? {}
      entry[`conso_${year}`] = (entry[`conso_${year}`] ?? 0) + d.pic_consommation_mw
      entry['_count_' + year] = (entry['_count_' + year] ?? 0) + 1
      byDayOfYear.set(week, entry)
    })
    return [...byDayOfYear.entries()]
      .sort(([a], [b]) => a - b)
      .map(([week, vals]) => {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
        const monthIdx = Math.min(Math.floor(week * 7 / 30.5), 11)
        const result: Record<string, string | number> = { mois: months[monthIdx] }
        comparisonYears.forEach(y => {
          const count = vals['_count_' + y] ?? 1
          result[String(y)] = Math.round((vals[`conso_${y}`] ?? 0) / count)
        })
        return result
      })
  }, [data])

  // Seasonal: average by month
  const seasonalData = useMemo(() => {
    if (!data) return []
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    const byMonth: { sum: number; count: number; tempSum: number }[] = Array.from({ length: 12 }, () => ({ sum: 0, count: 0, tempSum: 0 }))
    data.forEach(d => {
      if (!d.pic_consommation_mw) return
      const month = new Date(d.date).getMonth()
      byMonth[month].sum += d.pic_consommation_mw
      byMonth[month].count += 1
      byMonth[month].tempSum += d.temperature_moyenne ?? 0
    })
    return byMonth.map((m, i) => ({
      mois: months[i],
      consommation: m.count > 0 ? Math.round(m.sum / m.count) : 0,
      temperature: m.count > 0 ? +(m.tempSum / m.count).toFixed(1) : 0,
    }))
  }, [data])

  return (
    <div>
      <PageHeader
        title="Énergie & Climat"
        description="Comment évolue notre consommation d'électricité ?"
      />

      {peak && (
        <div className="mb-6">
          <InsightCard icon="⚡" title="Le saviez-vous ?">
            Le record absolu de consommation électrique a été atteint le{' '}
            <strong>
              {new Date(peak.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </strong>{' '}
            avec <strong>{((peak.pic_consommation_mw ?? 0) / 1000).toFixed(1)} GW</strong>
            {peak.temperature_moyenne !== null && (
              <>, alors que la température était de <strong>{peak.temperature_moyenne.toFixed(1)}°C</strong></>
            )}. En été, la consommation chute de moitié.
          </InsightCard>
        </div>
      )}

      {/* View selector */}
      <div className="flex gap-2 mb-6">
        {([
          { key: 'timeline', label: '📈 Chronologie' },
          { key: 'comparison', label: '🔄 Comparer les années' },
          { key: 'seasonal', label: '📊 Saisonnalité' },
        ] as { key: View; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              view === key ? 'bg-[#000091] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        {view === 'timeline' && (
          <>
            <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
              Consommation vs température (2023-2024)
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={timelineData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })} />
                <YAxis yAxisId="conso" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)} GW`} />
                <YAxis yAxisId="temp" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}°C`} />
                <Tooltip
                  formatter={(v: number, name: string) => name === 'Consommation' ? [`${(v / 1000).toFixed(1)} GW`, name] : [`${v.toFixed(1)}°C`, name]}
                  labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR')}
                />
                <Legend />
                <Line yAxisId="conso" type="monotone" dataKey="pic_consommation_mw" stroke="#dc2626" dot={false} strokeWidth={1.5} name="Consommation" />
                <Line yAxisId="temp" type="monotone" dataKey="temperature_moyenne" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="Température" />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        {view === 'comparison' && (
          <>
            <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
              Comparaison annuelle — Consommation moyenne par semaine
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={comparisonData}>
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)} GW`} />
                <Tooltip formatter={(v: number) => [`${(v / 1000).toFixed(1)} GW`]} />
                <Legend />
                {comparisonYears.map((year, i) => (
                  <Line key={year} type="monotone" dataKey={String(year)} stroke={YEAR_COLORS[i]} dot={false} strokeWidth={2} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        {view === 'seasonal' && (
          <>
            <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
              Saisonnalité — Consommation et température moyennes par mois
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={seasonalData}>
                <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="conso" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)} GW`} />
                <YAxis yAxisId="temp" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}°C`} />
                <Tooltip
                  formatter={(v: number, name: string) => name === 'Consommation' ? [`${(v / 1000).toFixed(1)} GW`, name] : [`${v}°C`, name]}
                />
                <Legend />
                <Bar yAxisId="conso" dataKey="consommation" fill="#dc2626" radius={[4, 4, 0, 0]} name="Consommation" />
                <Line yAxisId="temp" type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} dot name="Température" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  )
}
