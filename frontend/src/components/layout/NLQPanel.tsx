import { useState } from 'react'
import Markdown from 'react-markdown'
import DynamicChart from '../DynamicChart'

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

export default function NLQPanel() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-4 bottom-4 z-50 bg-[#000091] text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-lg hover:bg-[#1a1a8f] transition"
        title="Poser une question aux données"
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Panel */}
      <div className={`fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-40 transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="px-4 py-3 bg-[#000091] text-white">
          <h2 className="text-sm font-semibold">Interroger les données</h2>
          <p className="text-[10px] text-white/60">L'agent analyse vos questions en temps réel</p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 border-b border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Quel département a le plus de cambriolages ?"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-[#000091] text-white px-3 py-2 rounded text-sm disabled:opacity-50"
            >
              {loading ? '⏳' : '→'}
            </button>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto p-3">
          {loading && (
            <div className="flex flex-col gap-2 py-4 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span>Classification de la question...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700 text-xs">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="prose prose-sm max-w-none text-gray-800 text-xs [&>p]:mb-1">
                  <Markdown>{result.answer}</Markdown>
                </div>
              </div>

              {result.chart && <DynamicChart spec={result.chart} />}

              {/* Steps indicator */}
              <div className="space-y-1.5">
                {result.steps.map((s, i) => {
                  const isClassification = s.sql.startsWith('[Classification')
                  const category = isClassification ? s.sql.match(/: (\w+)/)?.[1] : null
                  return (
                    <div key={i} className="flex items-start gap-1.5 text-[10px]">
                      <span className={`mt-0.5 w-3 h-3 rounded-full shrink-0 flex items-center justify-center text-white text-[7px] ${s.error ? 'bg-red-400' : 'bg-green-400'}`}>✓</span>
                      {isClassification ? (
                        <span className="text-gray-500">
                          Question classée : <strong className={category === 'general' ? 'text-amber-600' : 'text-blue-600'}>{category === 'general' ? 'culture générale' : 'données'}</strong>
                        </span>
                      ) : (
                        <details className="text-gray-400 w-full">
                          <summary className="cursor-pointer text-gray-500">
                            {s.error ? '❌ Requête échouée' : `✅ SQL — ${(s.results?.length ?? 0)} résultat${(s.results?.length ?? 0) > 1 ? 's' : ''}`}
                          </summary>
                          <pre className="mt-1 bg-gray-50 rounded p-2 overflow-x-auto text-[10px]">{s.sql}</pre>
                        </details>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="text-center py-8 text-gray-400 text-xs space-y-3">
              <p>Posez n'importe quelle question sur les données françaises</p>
              <div className="space-y-1">
                {[
                  "Top 5 départements les plus chers ?",
                  "Évolution des cambriolages depuis 2016",
                  "Quel lien entre prix immobilier et vote RN ?",
                  "C'est quoi la Ve République ?",
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); askQuestion(s) }}
                    className="block w-full text-left px-3 py-1.5 bg-gray-50 hover:bg-blue-50 rounded text-gray-600 text-xs transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
