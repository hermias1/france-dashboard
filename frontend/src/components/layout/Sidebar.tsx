import { NavLink } from 'react-router-dom'

const MAIN_NAV = [
  { path: '/', label: 'Accueil', icon: '🏠' },
  { path: '/versus', label: 'Comparer', icon: '⚔️' },
  { path: '/quiz', label: 'Quiz', icon: '🎯' },
]

const THEMES = [
  { path: '/elections', label: 'Élections', color: '#1a2a5e' },
  { path: '/economie', label: 'Économie', color: '#0d6938' },
  { path: '/securite', label: 'Sécurité', color: '#b91c1c' },
  { path: '/energie', label: 'Énergie', color: '#d97706' },
  { path: '/sante', label: 'Santé', color: '#db2777' },
  { path: '/education', label: 'Éducation', color: '#7c3aed' },
  { path: '/transport', label: 'Transport', color: '#ea580c' },
  { path: '/numerique', label: 'Numérique', color: '#0891b2' },
  { path: '/environnement', label: 'Environnement', color: '#4d7c0f' },
  { path: '/politique', label: 'Politique', color: '#4338ca' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 bg-[#0a0a1a] text-white flex flex-col shrink-0 min-h-screen relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#000091]/20 via-transparent to-[#0a0a1a] pointer-events-none" />

      {/* Logo / Title */}
      <div className="relative px-5 py-6 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#000091] to-[#6a6af4] flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-500/20">
            🇫🇷
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
              ÉTAT DE LA FRANCE
            </h1>
            <p className="text-[9px] text-white/30 tracking-wide mt-0.5">PORTAIL CITOYEN</p>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 py-3 overflow-y-auto">
        {MAIN_NAV.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-[13px] transition-all duration-200 ${
                isActive
                  ? 'bg-white/10 text-white font-medium backdrop-blur-sm border-l-[3px] border-[#6a6af4] pl-[17px]'
                  : 'text-white/50 hover:text-white/90 hover:bg-white/5 border-l-[3px] border-transparent'
              }`
            }
          >
            <span className="text-sm">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}

        <div className="px-5 pt-5 pb-2 flex items-center gap-2">
          <div className="h-px flex-1 bg-white/8" />
          <span className="text-[9px] uppercase tracking-[0.2em] text-white/25 font-medium">Thématiques</span>
          <div className="h-px flex-1 bg-white/8" />
        </div>

        {THEMES.map(({ path, label, color }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2 text-[13px] transition-all duration-200 group ${
                isActive
                  ? 'text-white font-medium bg-white/8 border-l-[3px] pl-[17px]'
                  : 'text-white/45 hover:text-white/85 hover:bg-white/[0.03] border-l-[3px] border-transparent'
              }`
            }
            style={({ isActive }) => isActive ? { borderLeftColor: color } : {}}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
              style={{ backgroundColor: color, opacity: 0.8 }}
            />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="relative px-5 py-4 border-t border-white/8">
        <p className="text-[10px] text-white/20 leading-relaxed">
          Source : data.gouv.fr<br />
          Données ouvertes de la République
        </p>
      </div>
    </aside>
  )
}
