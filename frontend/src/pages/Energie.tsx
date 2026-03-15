import PageHeader from '../components/layout/PageHeader'
import EnergieSection from '../components/EnergieSection'

export default function Energie() {
  return (
    <div>
      <PageHeader
        title="Énergie & Climat"
        description="Consommation électrique nationale et température, données journalières 2013-2025"
      />
      <EnergieSection />
    </div>
  )
}
