import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import { useApi } from '../hooks/useApi'

interface Insight {
  title: string
  description: string
  correlation: number
  indicator_x: string
  indicator_y: string
  icon: string
}

// Map indicator keys to CorrelationScatter dropdown values
const INDICATOR_MAP: Record<string, string> = {
  prix_immo: 'immobilier',
  loyer: 'immobilier',
  cambriolages: 'cambriolages',
  violences: 'cambriolages',
  participation: 'participation',
  vote_rn: 'vote_rn',
  fibre: 'immobilier',
  accidents: 'immobilier',
  brevet: 'immobilier',
  medecins: 'immobilier',
  parite_maires: 'participation',
  densite_pop: 'immobilier',
  age_maires: 'participation',
  ratio_loyer_achat: 'immobilier',
  tendance_cambriolages: 'cambriolages',
  tendance_violences: 'cambriolages',
  prix_evolution: 'immobilier',
}

function CorrelationBadge({ r }: { r: number }) {
  const abs = Math.abs(r)
  const color = abs > 0.7
    ? 'bg-red-50 text-red-600 border-red-200'
    : abs > 0.5
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-blue-50 text-blue-600 border-blue-200'
  const label = r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2)
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${color}`}>
      r={label}
    </span>
  )
}

function StrengthLabel({ r }: { r: number }) {
  const abs = Math.abs(r)
  if (abs > 0.7) return <span className="text-red-600 font-semibold text-xs">Corrélation forte</span>
  if (abs > 0.5) return <span className="text-amber-600 font-semibold text-xs">Corrélation significative</span>
  return <span className="text-blue-600 font-semibold text-xs">Corrélation modérée</span>
}

export default function Decouvrir() {
  const { data, isLoading } = useApi<Insight[]>('insights-all', '/insights/correlations')
  const navigate = useNavigate()

  const fortes = data?.filter(d => Math.abs(d.correlation) > 0.7) ?? []
  const significatives = data?.filter(d => Math.abs(d.correlation) > 0.5 && Math.abs(d.correlation) <= 0.7) ?? []
  const moderees = data?.filter(d => Math.abs(d.correlation) <= 0.5) ?? []

  function handleClick(insight: Insight) {
    // Navigate to economie page which has the scatter plot
    // In the future, could navigate to a dedicated scatter page with params
    navigate(`/economie`)
  }

  function renderGroup(title: string, emoji: string, items: Insight[]) {
    if (items.length === 0) return null
    return (
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
          {emoji} {title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((insight, i) => (
            <button
              key={i}
              onClick={() => handleClick(insight)}
              className="text-left bg-white rounded-xl border border-gray-100 p-5 shadow-[var(--shadow-sm)] card-hover group transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-800 group-hover:text-[#000091] transition leading-tight pr-2" style={{ fontFamily: 'var(--font-display)' }}>
                  {insight.title}
                </h3>
                <CorrelationBadge r={insight.correlation} />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                {insight.description}
              </p>
              <div className="flex items-center justify-between">
                <StrengthLabel r={insight.correlation} />
                <span className="text-xs text-gray-400 group-hover:text-[#000091] transition">
                  Voir le scatter →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Découvertes"
        description="Ce que les données révèlent quand on croise les indicateurs"
      />

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 mb-8">
        <p className="text-sm text-gray-700 leading-relaxed">
          Le moteur de découvertes croise automatiquement <strong>16 indicateurs</strong> sur <strong>101 départements</strong> et
          identifie les corrélations statistiques les plus significatives. Plus le coefficient |r| est proche de 1,
          plus la relation est forte.
        </p>
        <p className="text-xs text-gray-500 mt-2 italic">
          Corrélation ≠ causalité. Ces liens statistiques invitent à la réflexion, pas aux conclusions hâtives.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <span className="inline-block w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {renderGroup('Corrélations fortes', '🔴', fortes)}
      {renderGroup('Corrélations significatives', '🟠', significatives)}
      {renderGroup('Corrélations modérées', '🔵', moderees)}
    </div>
  )
}
