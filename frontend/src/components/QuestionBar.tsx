import { useState } from 'react'

interface AgentStep {
  sql: string
  results?: Record<string, unknown>[]
  error?: string | null
}

interface AgentResult {
  question: string
  steps: AgentStep[]
  answer: string
}

export default function QuestionBar() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const suggestions = [
    "Quel est le taux de participation par région ?",
    "Quel jour a-t-on consommé le plus d'électricité ?",
    "Quelles sont les 5 régions où le RN a le plus de voix ?",
    "Compare la consommation d'énergie en janvier vs juillet 2024",
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

  // Find the last step with results to display as table
  const lastStepWithResults = result?.steps
    .filter(s => s.results && s.results.length > 0)
    .at(-1)

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
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '...' : 'Demander'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => { setQuery(s); askQuestion(s) }}
            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full transition"
            disabled={loading}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-gray-400 text-sm py-4 flex items-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          L'agent analyse vos données...
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-800 whitespace-pre-line">{result.answer}</p>
          </div>

          {/* Results table */}
          {lastStepWithResults?.results && lastStepWithResults.results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    {Object.keys(lastStepWithResults.results[0]).map((col) => (
                      <th key={col} className="py-2 px-3 text-xs uppercase text-gray-500 font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lastStepWithResults.results.slice(0, 20).map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="py-2 px-3 text-gray-700">
                          {typeof val === 'number'
                            ? Number.isInteger(val) ? val.toLocaleString('fr-FR') : Number(val).toFixed(2)
                            : String(val ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {lastStepWithResults.results.length > 20 && (
                <p className="text-xs text-gray-400 mt-2">
                  {lastStepWithResults.results.length} résultats au total
                </p>
              )}
            </div>
          )}

          {/* Agent steps (expandable) */}
          <details className="text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-gray-600">
              Voir le raisonnement de l'agent ({result.steps.length} requête{result.steps.length > 1 ? 's' : ''})
            </summary>
            <div className="mt-2 space-y-2">
              {result.steps.map((step, i) => (
                <div key={i} className="bg-gray-50 rounded p-3">
                  <div className="text-gray-500 mb-1">Étape {i + 1}</div>
                  <pre className="overflow-x-auto text-gray-600">{step.sql}</pre>
                  {step.error && <div className="text-red-500 mt-1">{step.error}</div>}
                  {step.results && (
                    <div className="text-gray-400 mt-1">{step.results.length} résultats</div>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </section>
  )
}
