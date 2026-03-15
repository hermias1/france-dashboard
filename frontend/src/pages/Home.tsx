import { Link } from 'react-router-dom'
import SearchTerritoire from '../components/SearchTerritoire'
import Decouvertes from '../components/Decouvertes'

const THEMES = [
  { path: '/elections', icon: '🗳️', label: 'Élections', color: 'bg-blue-50 border-blue-200', stat: 'EU 2024 + Présidentielle 2022' },
  { path: '/economie', icon: '💶', label: 'Économie', color: 'bg-emerald-50 border-emerald-200', stat: 'Immobilier, loyers par commune' },
  { path: '/securite', icon: '🛡️', label: 'Sécurité', color: 'bg-red-50 border-red-200', stat: 'Délinquance 2016-2025' },
  { path: '/energie', icon: '⚡', label: 'Énergie & Climat', color: 'bg-amber-50 border-amber-200', stat: 'Conso électrique, mix énergétique' },
  { path: '/sante', icon: '🏥', label: 'Santé', color: 'bg-rose-50 border-rose-200', stat: 'Déserts médicaux, accès aux soins' },
  { path: '/education', icon: '🎓', label: 'Éducation', color: 'bg-purple-50 border-purple-200', stat: 'Résultats du brevet' },
  { path: '/transport', icon: '🚗', label: 'Transport', color: 'bg-orange-50 border-orange-200', stat: 'Accidents de la route' },
  { path: '/numerique', icon: '📡', label: 'Numérique', color: 'bg-cyan-50 border-cyan-200', stat: 'Couverture fibre optique' },
  { path: '/environnement', icon: '🌍', label: 'Environnement', color: 'bg-lime-50 border-lime-200', stat: 'Désinformation climatique' },
  { path: '/politique', icon: '🏛️', label: 'Politique', color: 'bg-indigo-50 border-indigo-200', stat: 'Députés, sénateurs, maires' },
]

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-[#000091] text-white rounded-xl p-8 mb-8">
        <h1 className="text-3xl font-bold">Comprendre la France par les données</h1>
        <p className="text-white/70 mt-2 mb-6 max-w-xl">
          Tapez le nom de votre département pour découvrir comment il se situe
          par rapport à la moyenne nationale — immobilier, sécurité, éducation, fibre...
        </p>
        <SearchTerritoire />
      </div>

      {/* Découvertes */}
      <Decouvertes />

      {/* Theme cards */}
      <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Ou explorez par thématique</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
