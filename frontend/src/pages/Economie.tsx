import PageHeader from '../components/layout/PageHeader'
import ImmobilierSection from '../components/ImmobilierSection'
import CorrelationScatter from '../components/CorrelationScatter'

export default function Economie() {
  return (
    <div>
      <PageHeader
        title="Économie"
        description="Prix immobilier, loyers et indicateurs économiques par territoire"
      />
      <ImmobilierSection />
      <div className="mt-6">
        <CorrelationScatter />
      </div>
    </div>
  )
}
