interface Props {
  title: string
  description?: string
  children?: React.ReactNode
}

export default function PageHeader({ title, description, children }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        {children}
      </div>
    </div>
  )
}
