import { useApi } from '../hooks/useApi'
import type { ParticipationResult, EnergiePoint } from '../lib/api'

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 uppercase text-xs tracking-wide">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  )
}

export default function KPIBar() {
  const { data: participation } = useApi<ParticipationResult[]>(
    'participation',
    '/elections/participation?scrutin=europeennes-2024&niveau=region'
  )
  const { data: energie } = useApi<EnergiePoint[]>(
    'energie-latest',
    '/energie/consommation?date_min=2024-01-01&date_max=2024-12-31'
  )

  const totalInscrits = participation?.reduce((s, p) => s + p.inscrits, 0) ?? 0
  const totalVotants = participation?.reduce((s, p) => s + p.votants, 0) ?? 0
  const tauxParticipation = totalInscrits > 0
    ? ((totalVotants / totalInscrits) * 100).toFixed(1)
    : '—'

  const latestEnergie = energie?.[energie.length - 1]
  const picConso = latestEnergie?.pic_consommation_mw
    ? `${(latestEnergie.pic_consommation_mw / 1000).toFixed(1)} GW`
    : '—'
  const tempMoy = latestEnergie?.temperature_moyenne != null
    ? `${latestEnergie.temperature_moyenne.toFixed(1)}°C`
    : '—'

  return (
    <div className="flex items-center gap-6">
      <KPI label="Participation" value={`${tauxParticipation}%`} color="text-blue-600" />
      <KPI label="Pic conso" value={picConso} color="text-red-600" />
      <KPI label="Temp moy" value={tempMoy} color="text-amber-600" />
    </div>
  )
}
