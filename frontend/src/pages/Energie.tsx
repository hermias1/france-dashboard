import { useMemo } from 'react'
import PageHeader from '../components/layout/PageHeader'
import InsightCard from '../components/shared/InsightCard'
import EnergieSection from '../components/EnergieSection'
import { useApi } from '../hooks/useApi'
import type { EnergiePoint } from '../lib/api'

export default function Energie() {
  const { data } = useApi<EnergiePoint[]>(
    'energie-full',
    '/energie/consommation?date_min=2013-01-01&date_max=2025-12-31'
  )

  const peak = useMemo(() => {
    if (!data) return null
    let max: EnergiePoint | null = null
    for (const p of data) {
      if (p.pic_consommation_mw !== null && (!max || p.pic_consommation_mw > (max.pic_consommation_mw ?? 0))) {
        max = p
      }
    }
    return max
  }, [data])

  return (
    <div>
      <PageHeader
        title="Énergie & Climat"
        description="Comment évolue notre consommation d'électricité ?"
      />

      {peak && (
        <div className="mb-6">
          <InsightCard icon="💡" title="Le saviez-vous ?">
            Le pic de consommation électrique a été atteint le{' '}
            <strong>
              {new Date(peak.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </strong>{' '}
            avec <strong>{(peak.pic_consommation_mw! / 1000).toFixed(1)} GW</strong>
            {peak.temperature_moyenne !== null && (
              <>, alors que la température moyenne était de{' '}
              <strong>{peak.temperature_moyenne.toFixed(1)} °C</strong></>
            )}
            .
          </InsightCard>
        </div>
      )}

      <EnergieSection />
    </div>
  )
}
