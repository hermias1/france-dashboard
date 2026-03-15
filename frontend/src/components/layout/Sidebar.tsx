import { NavLink } from 'react-router-dom'

const MAIN_NAV = [
  { path: '/', label: 'Accueil', icon: '🏠' },
]

const THEMES = [
  { path: '/elections', label: 'Élections', icon: '🗳️' },
  { path: '/economie', label: 'Économie', icon: '💶' },
  { path: '/securite', label: 'Sécurité', icon: '🛡️' },
  { path: '/energie', label: 'Énergie & Climat', icon: '⚡' },
  { path: '/sante', label: 'Santé', icon: '🏥' },
  { path: '/education', label: 'Éducation', icon: '🎓' },
  { path: '/transport', label: 'Transport', icon: '🚗' },
  { path: '/numerique', label: 'Numérique', icon: '📡' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-[#1e1e2f] text-white flex flex-col shrink-0 min-h-screen">
      <div className="px-4 py-5 border-b border-white/10">
        <h1 className="text-sm font-bold tracking-wide">ÉTAT DE LA FRANCE</h1>
        <p className="text-[10px] text-white/40 mt-0.5">Portail citoyen des données publiques</p>
      </div>
      <nav className="flex-1 py-2 overflow-y-auto">
        {MAIN_NAV.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-white/10 text-white border-r-2 border-blue-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}

        <div className="px-4 pt-4 pb-1">
          <span className="text-[10px] uppercase tracking-widest text-white/30">Thématiques</span>
        </div>
        {THEMES.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-white/10 text-white border-r-2 border-blue-400'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-white/10 text-[10px] text-white/30">
        Données : data.gouv.fr
      </div>
    </aside>
  )
}
