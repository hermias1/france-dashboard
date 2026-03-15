import PageHeader from '../components/layout/PageHeader'
import DelinquanceSection from '../components/DelinquanceSection'

export default function Securite() {
  return (
    <div>
      <PageHeader
        title="Sécurité"
        description="Délinquance enregistrée par la police et la gendarmerie, 2016-2025"
      />
      <DelinquanceSection />
    </div>
  )
}
