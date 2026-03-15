import PageHeader from '../components/layout/PageHeader'

export default function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="text-4xl mb-4">🚧</div>
        <h2 className="text-lg font-semibold text-gray-700">Section en construction</h2>
        <p className="text-sm text-gray-500 mt-2">Les données seront bientôt disponibles.</p>
      </div>
    </div>
  )
}
