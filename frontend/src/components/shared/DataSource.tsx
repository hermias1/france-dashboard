interface Props {
  sources: { label: string; url?: string }[]
}

export default function DataSource({ sources }: Props) {
  return (
    <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
      <span className="font-medium">Sources : </span>
      {sources.map((s, i) => (
        <span key={i}>
          {s.url ? (
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 underline">
              {s.label}
            </a>
          ) : (
            s.label
          )}
          {i < sources.length - 1 && ' · '}
        </span>
      ))}
    </div>
  )
}
