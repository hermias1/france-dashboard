import { useIsMobile } from '../hooks/useIsMobile'
import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
import { useApi } from '../hooks/useApi'

interface MandatStats {
  total: number
  hommes: number
  femmes: number
  age_moyen: number
}

interface PolitiqueStats {
  deputes: MandatStats
  senateurs: MandatStats
  maires: MandatStats
}

interface Elu {
  nom: string
  prenom: string
  sexe: string | null
  code_departement: string | null
  profession: string | null
}

interface PariteDepartement {
  code_departement: string
  nom_departement: string
  pct_femmes_maires: number
}

function StatCard({ label, stats }: { label: string; stats: MandatStats }) {
  const pctFemmes = stats.total > 0 ? ((stats.femmes / stats.total) * 100).toFixed(1) : '0'
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</h3>
      <div className="text-3xl font-bold text-gray-900 mb-2">{stats.total.toLocaleString('fr-FR')}</div>
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex justify-between">
          <span>Hommes</span>
          <span className="font-semibold">{stats.hommes.toLocaleString('fr-FR')}</span>
        </div>
        <div className="flex justify-between">
          <span>Femmes</span>
          <span className="font-semibold">{stats.femmes.toLocaleString('fr-FR')} ({pctFemmes}%)</span>
        </div>
        <div className="flex justify-between">
          <span>Age moyen</span>
          <span className="font-semibold">{stats.age_moyen} ans</span>
        </div>
      </div>
    </div>
  )
}

export default function Politique() {
  const isMobile = useIsMobile()
  const { data: stats } = useApi<PolitiqueStats>('politique-stats', '/politique/stats')
  const { data: deputes } = useApi<Elu[]>('politique-deputes', '/politique/deputes')
  const { data: parite } = useApi<PariteDepartement[]>('politique-parite', '/politique/parite-departement')

  const pctFemmesAN = stats && stats.deputes.total > 0
    ? ((stats.deputes.femmes / stats.deputes.total) * 100).toFixed(1)
    : null
  const pctFemmesMaires = stats && stats.maires.total > 0
    ? ((stats.maires.femmes / stats.maires.total) * 100).toFixed(1)
    : null

  // CSP des députés (truncate long labels)
  const cspData = useMemo(() => {
    if (!deputes) return []
    const counts: Record<string, number> = {}
    for (const d of deputes) {
      const prof = d.profession || 'Non renseigné'
      counts[prof] = (counts[prof] || 0) + 1
    }
    return Object.entries(counts)
      .map(([profession, nombre]) => ({
        profession: profession.length > 30 ? profession.slice(0, 28) + '…' : profession,
        nombre,
      }))
      .sort((a, b) => b.nombre - a.nombre)
      .slice(0, 10)
  }, [deputes])

  // Parite rankings
  const topParite = useMemo(() => {
    if (!parite) return []
    return parite.slice(0, 10)
  }, [parite])

  const bottomParite = useMemo(() => {
    if (!parite) return []
    return [...parite].reverse().slice(0, 10)
  }, [parite])

  const maxTop = topParite.length ? topParite[0].pct_femmes_maires : 1
  const maxBottom = bottomParite.length ? bottomParite[0].pct_femmes_maires || 1 : 1

  return (
    <div>
      <PageHeader
        title="Politique"
        description="Qui vous repr&eacute;sente ?"
      />

      {pctFemmesAN && pctFemmesMaires && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            Il y a <strong>{pctFemmesAN}%</strong> de femmes à l'Assemblée nationale
            et <strong>{pctFemmesMaires}%</strong> parmi les maires.
          </InsightCard>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard label="Députés" stats={stats.deputes} />
          <StatCard label="Sénateurs" stats={stats.senateurs} />
          <StatCard label="Maires" stats={stats.maires} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {topParite.length > 0 && (
          <Ranking
            title="👩‍💼 Parité maires — Départements les plus paritaires"
            color="bg-purple-500"
            items={topParite.map((d) => ({
              label: d.nom_departement,
              value: `${d.pct_femmes_maires}%`,
              barPct: (d.pct_femmes_maires / maxTop) * 100,
            }))}
          />
        )}
        {bottomParite.length > 0 && (
          <Ranking
            title="📉 Parité maires — Départements les moins paritaires"
            color="bg-orange-500"
            items={bottomParite.map((d) => ({
              label: d.nom_departement,
              value: `${d.pct_femmes_maires}%`,
              barPct: (d.pct_femmes_maires / maxBottom) * 100,
            }))}
          />
        )}
      </div>

      {cspData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Top 10 — Professions des députés
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={cspData} layout="vertical" margin={{ left: isMobile ? 80 : 190 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="profession" width={isMobile ? 70 : 180} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number) => [value.toLocaleString('fr-FR'), 'Députés']} />
              <Bar dataKey="nombre" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
