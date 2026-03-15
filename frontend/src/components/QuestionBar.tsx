import { useState } from 'react'
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

interface AgentStep {
  sql: string
  results?: Record<string, unknown>[]
  error?: string | null
}

interface AgentResult {
  question: string
  steps: AgentStep[]
  answer: string
  chart?: ChartSpec | null
}

export default function QuestionBar() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const suggestions = [
    "Quel est le taux de participation par région ?",
    "Top 5 départements les plus chers en immobilier",
    "Quelles sont les 5 régions où le RN a le plus de voix ?",
    "Compare cambriolages et prix immobilier par département",
  ]

  async function askQuestion(q: string) {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Erreur serveur')
      }
      setResult(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) askQuestion(query.trim())
  }

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
        Posez une question aux données
      </h2>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: Quelle région a le plus voté aux européennes ?"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : 'Analyser'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => { setQuery(s); askQuestion(s) }}
            className="text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 px-3 py-1.5 rounded-full transition border border-transparent hover:border-blue-200"
            disabled={loading}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <span className="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">L'agent analyse vos données...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Answer */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
            <div className="prose prose-sm max-w-none text-gray-800
              [&>p]:text-sm [&>p]:leading-relaxed [&>p]:mb-2
              [&>ul]:text-sm [&>ol]:text-sm
              [&>strong]:text-gray-900
            ">
              <Markdown>{result.answer}</Markdown>
            </div>
          </div>

          {/* Chart */}
          {result.chart && <DynamicChart spec={result.chart} />}

          {/* Agent reasoning */}
          <details className="text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-gray-600">
              Raisonnement ({result.steps.length} requête{result.steps.length > 1 ? 's' : ''})
            </summary>
            <div className="mt-2 space-y-2">
              {result.steps.map((step, i) => (
                <div key={i} className="bg-gray-50 rounded p-3 font-mono">
                  <pre className="overflow-x-auto text-gray-600 text-[11px]">{step.sql}</pre>
                  {step.error && <div className="text-red-500 mt-1 font-sans">{step.error}</div>}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </section>
  )
}
