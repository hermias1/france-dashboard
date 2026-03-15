import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Markdown from 'react-markdown'
import DynamicChart from './DynamicChart'

interface ChartSpec {
  chart_type: string
  title: string
  data: Record<string, unknown>[]
  x_key: string
  y_keys: string[]
  colors?: string[]
}

interface AgentResult {
  question: string
  steps: { sql: string }[]
  answer: string
  chart?: ChartSpec | null
}

const SUGGESTIONS = [
  "Top 5 départements les plus sûrs",
  "Quel lien entre loyers et vote RN ?",
  "Où les maires sont les plus jeunes ?",
  "Record de consommation électrique",
]

export default function HomeNLQ() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AgentResult | null>(null)

  async function askQuestion(q: string) {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      if (res.ok) setResult(await res.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) askQuestion(query.trim())
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-[var(--shadow-sm)] p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#000091] to-[#6a6af4] flex items-center justify-center text-white text-xs">💬</div>
        <h2 className="text-xs uppercase tracking-[0.15em] text-gray-500 font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          Posez une question aux données
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: Quel département a le plus de médecins ?"
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#000091] focus:ring-1 focus:ring-[#000091]/20"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-[#000091] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1a1a8f] disabled:opacity-50 transition shrink-0"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : '→'}
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => { setQuery(s); askQuestion(s) }}
            disabled={loading}
            className="text-[11px] bg-gray-50 hover:bg-blue-50 hover:text-[#000091] text-gray-500 px-2.5 py-1 rounded-full transition border border-transparent hover:border-blue-200"
          >
            {s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 justify-center text-gray-400 text-sm">
          <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          L'agent analyse...
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="prose prose-sm max-w-none text-gray-800 text-sm [&>p]:mb-1">
              <Markdown>{result.answer}</Markdown>
            </div>
          </div>
          {result.chart && <DynamicChart spec={result.chart} />}
        </div>
      )}
    </div>
  )
}
