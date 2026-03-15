import { useIsMobile } from '../hooks/useIsMobile'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const DEFAULT_COLORS = [
  '#2563eb', '#dc2626', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
]

interface ChartSpec {
  chart_type: string
  title: string
  data: Record<string, unknown>[]
  x_key: string
  y_keys: string[]
  colors?: string[]
  x_label?: string
  y_label?: string
}

export default function DynamicChart({ spec }: { spec: ChartSpec }) {
  const isMobile = useIsMobile()
  const colors = spec.colors?.length ? spec.colors : DEFAULT_COLORS
  const data = spec.data

  if (!data || data.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{spec.title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {spec.chart_type === 'horizontal_bar' ? (
          <BarChart data={data} layout="vertical" margin={{ left: isMobile ? 60 : 100 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey={spec.x_key} width={90} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {spec.y_keys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[0, 4, 4, 0]} barSize={18} name={key} />
            ))}
          </BarChart>
        ) : spec.chart_type === 'bar' ? (
          <BarChart data={data}>
            <XAxis dataKey={spec.x_key} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {spec.y_keys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} name={key} />
            ))}
          </BarChart>
        ) : spec.chart_type === 'line' ? (
          <LineChart data={data}>
            <XAxis dataKey={spec.x_key} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {spec.y_keys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} dot={false} strokeWidth={2} name={key} />
            ))}
          </LineChart>
        ) : spec.chart_type === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey={spec.y_keys[0]} nameKey={spec.x_key} cx="50%" cy="50%" outerRadius={100} label>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        ) : spec.chart_type === 'scatter' ? (
          <ScatterChart>
            <XAxis dataKey={spec.x_key} tick={{ fontSize: 11 }} name={spec.x_label || spec.x_key} />
            <YAxis dataKey={spec.y_keys[0]} tick={{ fontSize: 11 }} name={spec.y_label || spec.y_keys[0]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data} fill={colors[0]} />
          </ScatterChart>
        ) : (
          <div className="text-gray-400 text-sm">Type de graphique non supporté: {spec.chart_type}</div>
        )}
      </ResponsiveContainer>
    </div>
  )
}
