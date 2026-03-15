import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

interface SearchResult {
  code: string
  nom: string
  type: string
}

export default function SearchTerritoire() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/territoire/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          setResults(await res.json())
          setOpen(true)
        }
      } catch { /* ignore */ }
    }, 200)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(r: SearchResult) {
    setOpen(false)
    setQuery('')
    navigate(`/territoire/${r.code}`)
  }

  return (
    <div ref={ref} className="relative w-full max-w-lg">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher un département (ex: Rhône, 69, Paris...)"
          className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-[#000091] focus:ring-2 focus:ring-[#000091]/20 shadow-sm"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
          {results.map((r) => (
            <button
              key={r.code}
              onClick={() => select(r)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition flex items-center gap-3 border-b border-gray-100 last:border-0"
            >
              <span className="text-gray-400 text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">{r.code}</span>
              <span className="text-sm text-gray-800">{r.nom}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
