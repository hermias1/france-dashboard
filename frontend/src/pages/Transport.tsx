import { useIsMobile } from '../hooks/useIsMobile'
import { useMemo, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
import { useApi } from '../hooks/useApi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface AccidentDept {
  code_departement: string
  nom_departement: string
  nb_accidents: number
  population?: number | null
  taux_pour_100k?: number | null
}

type Mode = 'absolu' | 'habitant'

export default function Transport() {
  const [mode, setMode] = useState<Mode>('absolu')
  const isMobile = useIsMobile()
  const { data, isLoading } = useApi<AccidentDept[]>('accidents', '/accidents/departements?annee=2024')

  const sortedAbsolu = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => b.nb_accidents - a.nb_accidents)
  }, [data])

  const sortedPerCapita = useMemo(() => {
    if (!data) return []
    return [...data]
      .filter(d => d.taux_pour_100k != null && d.taux_pour_100k > 0)
      .sort((a, b) => (b.taux_pour_100k ?? 0) - (a.taux_pour_100k ?? 0))
  }, [data])

  const sorted = mode === 'absolu' ? sortedAbsolu : sortedPerCapita
  const totalAccidents = sortedAbsolu.reduce((s, d) => s + d.nb_accidents, 0)
  const top10 = sorted.slice(0, 10)

  const getValue = (d: AccidentDept) => mode === 'absolu' ? d.nb_accidents : (d.taux_pour_100k ?? 0)
  const maxVal = top10.length ? getValue(top10[0]) : 1
  const dataKey = mode === 'absolu' ? 'nb_accidents' : 'taux_pour_100k'
  const unit = mode === 'absolu' ? 'accidents' : 'pour 100 000 hab.'

  // Per capita insight
  const mostDangerousPerCapita = sortedPerCapita[0]

  return (
    <div>
      <PageHeader
        title="Transport"
        description="Où les routes sont-elles les plus dangereuses ?"
      />

      {sortedAbsolu.length > 0 && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            En 2024, la France a enregistré <strong>{totalAccidents.toLocaleString('fr-FR')}</strong> accidents
            corporels de la route. En nombre absolu, <strong>{sortedAbsolu[0].nom_departement}</strong> est
            en tête ({sortedAbsolu[0].nb_accidents.toLocaleString('fr-FR')}).
            {mostDangerousPerCapita && (
              <> Mais rapporté à la population, c'est <strong>{mostDangerousPerCapita.nom_departement}</strong> qui
              est le plus accidentogène avec <strong>{mostDangerousPerCapita.taux_pour_100k?.toFixed(1)}</strong> accidents
              pour 100 000 habitants.</>
            )}
          </InsightCard>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('absolu')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'absolu' ? 'bg-[#000091] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📊 Nombre absolu
        </button>
        <button
          onClick={() => setMode('habitant')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === 'habitant' ? 'bg-[#000091] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          👥 Par habitant
        </button>
      </div>

      {top10.length > 0 && (
        <div className="mb-6">
          <Ranking
            title={`⚠️ Top 10 — ${mode === 'absolu' ? 'Plus d\'accidents (absolu)' : 'Plus accidentogènes (par habitant)'}`}
            color="bg-red-500"
            items={top10.map((d) => ({
              label: d.nom_departement,
              value: mode === 'absolu'
                ? d.nb_accidents.toLocaleString('fr-FR')
                : `${(d.taux_pour_100k ?? 0).toFixed(1)} ‱`,
              barPct: (getValue(d) / maxVal) * 100,
            }))}
          />
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
          {mode === 'absolu' ? 'Accidents par département' : 'Taux d\'accidents pour 100 000 habitants'}
        </h2>
        {isLoading ? (
          <div className="text-gray-400 py-8 text-center text-sm">Chargement...</div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={top10} layout="vertical" margin={{ left: isMobile ? 80 : 140 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nom_departement" width={isMobile ? 70 : 130} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [mode === 'absolu' ? v.toLocaleString('fr-FR') : v.toFixed(1), unit]} />
              <Bar dataKey={dataKey} fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
