import { Link } from 'react-router-dom'
import SearchTerritoire from '../components/SearchTerritoire'
import Decouvertes from '../components/Decouvertes'

const THEMES = [
  { path: '/elections', label: 'Élections', stat: 'EU 2024 + Présidentielle', color: '#1a2a5e', gradient: 'from-[#1a2a5e] to-[#2d4a8e]' },
  { path: '/economie', label: 'Économie', stat: 'Immobilier, loyers', color: '#0d6938', gradient: 'from-[#0d6938] to-[#15803d]' },
  { path: '/securite', label: 'Sécurité', stat: 'Délinquance 2016-2025', color: '#b91c1c', gradient: 'from-[#b91c1c] to-[#dc2626]' },
  { path: '/energie', label: 'Énergie', stat: 'Mix, conso, climat', color: '#d97706', gradient: 'from-[#d97706] to-[#f59e0b]' },
  { path: '/sante', label: 'Santé', stat: 'Déserts médicaux', color: '#db2777', gradient: 'from-[#db2777] to-[#ec4899]' },
  { path: '/education', label: 'Éducation', stat: 'Brevet', color: '#7c3aed', gradient: 'from-[#7c3aed] to-[#8b5cf6]' },
  { path: '/transport', label: 'Transport', stat: 'Accidents de la route', color: '#ea580c', gradient: 'from-[#ea580c] to-[#f97316]' },
  { path: '/numerique', label: 'Numérique', stat: 'Couverture fibre', color: '#0891b2', gradient: 'from-[#0891b2] to-[#06b6d4]' },
  { path: '/environnement', label: 'Environnement', stat: 'Désinformation climat', color: '#4d7c0f', gradient: 'from-[#4d7c0f] to-[#65a30d]' },
  { path: '/politique', label: 'Politique', stat: 'Députés, maires', color: '#4338ca', gradient: 'from-[#4338ca] to-[#6366f1]' },
]

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl mb-8" style={{ background: 'linear-gradient(135deg, #000091 0%, #1a1a6e 40%, #0a0a2e 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#6a6af4]/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#e1000f]/10 blur-2xl" />

        <div className="relative px-8 py-10">
          <p className="text-[#c9992d] text-xs font-semibold uppercase tracking-[0.2em] mb-3">
            Portail citoyen des données publiques
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Comprendre la France<br />
            <span className="text-white/60">par les données</span>
          </h1>
          <p className="text-white/40 mt-3 mb-6 max-w-lg text-sm leading-relaxed">
            Tapez votre département pour voir comment il se situe.
            Explorez les élections, l'économie, la sécurité, l'énergie.
          </p>
          <SearchTerritoire />
        </div>
      </div>

      {/* Découvertes */}
      <Decouvertes />

      {/* Theme grid */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gray-200" />
        <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 font-medium" style={{ fontFamily: 'var(--font-display)' }}>
          Explorer par thématique
        </h2>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {THEMES.map(({ path, label, stat, gradient }) => (
          <Link
            key={path}
            to={path}
            className="group relative overflow-hidden rounded-xl card-hover"
          >
            <div className={`bg-gradient-to-br ${gradient} p-4 h-full min-h-[90px] flex flex-col justify-between`}>
              <h3 className="text-white font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>
                {label}
              </h3>
              <p className="text-white/50 text-[10px] mt-1">{stat}</p>
              {/* Hover arrow */}
              <span className="absolute top-3 right-3 text-white/20 group-hover:text-white/60 transition text-lg">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
