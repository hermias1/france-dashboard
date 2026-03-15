import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import type { ParticipationResult, EnergiePoint } from '../lib/api'

const THEMES = [
  { path: '/elections', icon: '🗳️', label: 'Élections', color: 'bg-blue-50 border-blue-200', stat: 'EU 2024 + Présidentielle 2022' },
  { path: '/economie', icon: '💶', label: 'Économie', color: 'bg-emerald-50 border-emerald-200', stat: 'Prix immobilier, loyers' },
  { path: '/securite', icon: '🛡️', label: 'Sécurité', color: 'bg-red-50 border-red-200', stat: 'Délinquance 2016-2025' },
  { path: '/energie', icon: '⚡', label: 'Énergie & Climat', color: 'bg-amber-50 border-amber-200', stat: 'Consommation journalière' },
]

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  )
}

export default function Home() {
  const { data: participation } = useApi<ParticipationResult[]>(
    'participation-home',
    '/elections/participation?scrutin=europeennes-2024&niveau=region'
  )
  const { data: energie } = useApi<EnergiePoint[]>(
    'energie-home',
    '/energie/consommation?date_min=2024-01-01&date_max=2024-12-31'
  )

  const totalInscrits = participation?.reduce((s, p) => s + p.inscrits, 0) ?? 0
  const totalVotants = participation?.reduce((s, p) => s + p.votants, 0) ?? 0
  const taux = totalInscrits > 0 ? ((totalVotants / totalInscrits) * 100).toFixed(1) : '—'
  const latestE = energie?.[energie.length - 1]

  return (
    <div>
      {/* Hero */}
      <div className="bg-[#000091] text-white rounded-xl p-8 mb-6">
        <h1 className="text-3xl font-bold">Comprendre la France par les données</h1>
        <p className="text-white/70 mt-2 max-w-xl">
          Explorez les données publiques françaises — élections, économie, sécurité, énergie.
          Croisez les indicateurs. Posez vos questions.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI label="Participation EU 2024" value={`${taux}%`} color="text-blue-600" />
        <KPI
          label="Pic consommation"
          value={latestE?.pic_consommation_mw ? `${(latestE.pic_consommation_mw / 1000).toFixed(1)} GW` : '—'}
          color="text-red-600"
        />
        <KPI
          label="Température moy."
          value={latestE?.temperature_moyenne != null ? `${latestE.temperature_moyenne.toFixed(1)}°C` : '—'}
          color="text-amber-600"
        />
        <KPI label="Départements" value="101" color="text-gray-700" />
      </div>

      {/* Theme cards */}
      <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Explorer par thématique</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {THEMES.map(({ path, icon, label, color, stat }) => (
          <Link
            key={path}
            to={path}
            className={`${color} border rounded-lg p-5 hover:shadow-md transition group`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition">{label}</h3>
                <p className="text-xs text-gray-500">{stat}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
