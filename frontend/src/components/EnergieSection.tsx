import { useApi } from '../hooks/useApi'
import type { EnergiePoint } from '../lib/api'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export default function EnergieSection() {
  const { data, isLoading, error } = useApi<EnergiePoint[]>(
    'energie',
    '/energie/consommation?date_min=2023-01-01&date_max=2024-12-31'
  )

  if (isLoading) return <div className="text-gray-400 py-8">Chargement...</div>
  if (error || !data) return <div className="text-red-500 py-8">Erreur de chargement</div>

  const sampled = data.filter((_, i) => i % 7 === 0)

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
        Consommation électrique nationale
      </h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={sampled}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
          />
          <YAxis
            yAxisId="conso"
            orientation="left"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)} GW`}
          />
          <YAxis
            yAxisId="temp"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}°C`}
          />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === 'Consommation'
                ? [`${(value / 1000).toFixed(1)} GW`, 'Consommation']
                : [`${value.toFixed(1)}°C`, 'Température']
            }
            labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR')}
          />
          <Legend />
          <Line
            yAxisId="conso"
            type="monotone"
            dataKey="pic_consommation_mw"
            stroke="#dc2626"
            dot={false}
            strokeWidth={1.5}
            name="Consommation"
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperature_moyenne"
            stroke="#f59e0b"
            dot={false}
            strokeWidth={1.5}
            name="Température"
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  )
}
