import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import Ranking from '../components/shared/Ranking'
import { useApi } from '../hooks/useApi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface DesinfoMedia {
  media: string
  is_public: boolean
  is_info_continu: boolean
  is_radio: boolean
  couverture_climat: number
  cas_desinfo: number
  desinfo_par_heure: number
}

export default function Environnement() {
  const { data, isLoading } = useApi<DesinfoMedia[]>('desinfo', '/environnement/desinfo-climat')

  const sorted = data ? [...data].sort((a, b) => b.cas_desinfo - a.cas_desinfo) : []
  const maxCas = sorted.length ? sorted[0].cas_desinfo : 1
  const totalCas = sorted.reduce((s, d) => s + d.cas_desinfo, 0)

  const publicMedia = sorted.filter(d => d.is_public)
  const privateMedia = sorted.filter(d => !d.is_public)
  const publicCas = publicMedia.reduce((s, d) => s + d.cas_desinfo, 0)
  const privateCas = privateMedia.reduce((s, d) => s + d.cas_desinfo, 0)

  return (
    <div>
      <PageHeader
        title="Environnement"
        description="Quelle est la qualité de l'information climatique dans nos médias ?"
      />

      {sorted.length > 0 && (
        <div className="mb-6">
          <InsightCard icon="🌍" title="Le saviez-vous ?">
            En 2025, <strong>{totalCas} cas</strong> de mésinformation climatique ont été détectés
            dans les médias audiovisuels français. <strong>{sorted[0].media}</strong> concentre
            à elle seule <strong>{sorted[0].cas_desinfo} cas</strong> ({((sorted[0].cas_desinfo / totalCas) * 100).toFixed(0)}% du total).
            Les médias privés totalisent <strong>{privateCas} cas</strong> contre seulement <strong>{publicCas}</strong> pour le service public.
          </InsightCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {sorted.length > 0 && (
          <Ranking
            title="📺 Classement — Cas de désinformation climatique par média"
            color="bg-red-500"
            items={sorted.filter(d => d.cas_desinfo > 0).map(d => ({
              label: `${d.media} ${d.is_public ? '(public)' : ''}`,
              value: `${d.cas_desinfo} cas`,
              barPct: (d.cas_desinfo / maxCas) * 100,
            }))}
          />
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Désinformation par heure d'antenne climat
          </h3>
          {isLoading ? (
            <div className="text-gray-400 py-8 text-center text-sm">Chargement...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sorted.filter(d => d.desinfo_par_heure > 0)} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="media" width={70} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)} cas/h`, 'Désinfo par heure climat']} />
                <Bar dataKey="desinfo_par_heure" radius={[0, 4, 4, 0]} barSize={16}>
                  {sorted.filter(d => d.desinfo_par_heure > 0).map((d, i) => (
                    <Cell key={i} fill={d.is_public ? '#2563eb' : '#dc2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600" /> Public</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600" /> Privé</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-500">
        Source : Observatoire des Médias sur l'Écologie, 2025. Monitoring des médias audiovisuels français.
      </div>
    </div>
  )
}
