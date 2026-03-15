import { useMemo, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import { useApi } from '../hooks/useApi'
import type { EnergiePoint } from '../lib/api'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts'

interface MixJour {
  date: string
  consommation_mw: number
  nucleaire_mw: number
  eolien_mw: number
  solaire_mw: number
  hydraulique_mw: number
  gaz_mw: number
  bioenergies_mw: number
  taux_co2: number | null
}

interface MixMoyen {
  nucleaire_pct: number
  eolien_pct: number
  solaire_pct: number
  hydraulique_pct: number
  gaz_pct: number
  bioenergies_pct: number
}

const MIX_COLORS = {
  nucleaire: '#2563eb',
  eolien: '#06b6d4',
  solaire: '#f59e0b',
  hydraulique: '#10b981',
  gaz: '#ef4444',
  bioenergies: '#8b5cf6',
}

type View = 'timeline' | 'comparison' | 'seasonal' | 'mix'

const YEAR_COLORS = ['#2563eb', '#dc2626', '#f59e0b', '#10b981', '#8b5cf6']

export default function Energie() {
  const [view, setView] = useState<View>('timeline')

  const { data } = useApi<EnergiePoint[]>(
    'energie-full',
    '/energie/consommation?date_min=2013-01-01&date_max=2025-12-31'
  )
  const { data: mixData } = useApi<MixJour[]>('mix', '/energie/mix')
  const { data: mixMoyen } = useApi<MixMoyen>('mix-moyen', '/energie/mix/moyenne')

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
          { key: 'mix', label: '⚛️ Mix énergétique' },
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

        {view === 'mix' && mixData && (
          <>
            <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
              Mix énergétique journalier (production moyenne par source)
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={mixData}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)} GW`} />
                <Tooltip formatter={(v: number, name: string) => [`${(v / 1000).toFixed(1)} GW`, name]} labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR')} />
                <Legend />
                <Area type="monotone" dataKey="nucleaire_mw" stackId="1" fill={MIX_COLORS.nucleaire} stroke={MIX_COLORS.nucleaire} name="Nucléaire" />
                <Area type="monotone" dataKey="hydraulique_mw" stackId="1" fill={MIX_COLORS.hydraulique} stroke={MIX_COLORS.hydraulique} name="Hydraulique" />
                <Area type="monotone" dataKey="eolien_mw" stackId="1" fill={MIX_COLORS.eolien} stroke={MIX_COLORS.eolien} name="Éolien" />
                <Area type="monotone" dataKey="solaire_mw" stackId="1" fill={MIX_COLORS.solaire} stroke={MIX_COLORS.solaire} name="Solaire" />
                <Area type="monotone" dataKey="gaz_mw" stackId="1" fill={MIX_COLORS.gaz} stroke={MIX_COLORS.gaz} name="Gaz" />
                <Area type="monotone" dataKey="bioenergies_mw" stackId="1" fill={MIX_COLORS.bioenergies} stroke={MIX_COLORS.bioenergies} name="Bioénergies" />
              </AreaChart>
            </ResponsiveContainer>

            {mixMoyen && (
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Répartition moyenne</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Nucléaire', value: mixMoyen.nucleaire_pct },
                          { name: 'Hydraulique', value: mixMoyen.hydraulique_pct },
                          { name: 'Éolien', value: mixMoyen.eolien_pct },
                          { name: 'Solaire', value: mixMoyen.solaire_pct },
                          { name: 'Gaz', value: mixMoyen.gaz_pct },
                          { name: 'Bioénergies', value: mixMoyen.bioenergies_pct },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%" cy="50%"
                        outerRadius={90}
                        label={({ name, value }) => `${name} ${value}%`}
                      >
                        {Object.values(MIX_COLORS).map((color, i) => (
                          <Cell key={i} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center space-y-2">
                  {[
                    { label: 'Nucléaire', pct: mixMoyen.nucleaire_pct, color: MIX_COLORS.nucleaire },
                    { label: 'Hydraulique', pct: mixMoyen.hydraulique_pct, color: MIX_COLORS.hydraulique },
                    { label: 'Éolien', pct: mixMoyen.eolien_pct, color: MIX_COLORS.eolien },
                    { label: 'Solaire', pct: mixMoyen.solaire_pct, color: MIX_COLORS.solaire },
                    { label: 'Gaz', pct: mixMoyen.gaz_pct, color: MIX_COLORS.gaz },
                    { label: 'Bioénergies', pct: mixMoyen.bioenergies_pct, color: MIX_COLORS.bioenergies },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
                      <span className="text-sm text-gray-700 flex-1">{label}</span>
                      <span className="text-sm font-bold text-gray-900">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
