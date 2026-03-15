import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import SearchDepartement from '../components/SearchDepartement'

interface Indicateur {
  label: string
  valeur: string
  detail?: string | null
  comparaison: string
  ecart_pct: number
  icone: string
}

interface TerritoireProfile {
  code: string
  nom: string
  type: string
  indicateurs: Indicateur[]
}

const INVERSE_INDICATORS = ['Cambriolages', 'Accidents route']

function getScore(ecart: number, label: string): number {
  return INVERSE_INDICATORS.includes(label) ? -ecart : ecart
}

function ComparisonRow({
  label,
  icone,
  left,
  right,
}: {
  label: string
  icone: string
  left: Indicateur
  right: Indicateur
}) {
  const scoreL = getScore(left.ecart_pct, label)
  const scoreR = getScore(right.ecart_pct, label)
  const leftWins = scoreL > scoreR
  const rightWins = scoreR > scoreL
  const tie = scoreL === scoreR

  return (
    <div className="flex items-center gap-2 py-3 px-4 border-b border-gray-100 last:border-0">
      {/* Left value */}
      <div
        className={`flex-1 text-right py-2 px-3 rounded-lg font-semibold text-sm ${
          leftWins ? 'bg-green-50 text-green-700' : rightWins ? 'bg-red-50 text-red-400' : 'bg-gray-50 text-gray-600'
        }`}
      >
        {left.valeur}
        {leftWins && <span className="ml-2 text-green-500">✓</span>}
      </div>

      {/* Center label */}
      <div className="flex flex-col items-center w-40 shrink-0">
        <span className="text-lg">{icone}</span>
        <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>
        {tie && <span className="text-[10px] text-gray-400">égalité</span>}
      </div>

      {/* Right value */}
      <div
        className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm ${
          rightWins ? 'bg-green-50 text-green-700' : leftWins ? 'bg-red-50 text-red-400' : 'bg-gray-50 text-gray-600'
        }`}
      >
        {right.valeur}
        {rightWins && <span className="ml-2 text-green-500">✓</span>}
      </div>
    </div>
  )
}

function ComparisonPanel({ left, right }: { left: TerritoireProfile; right: TerritoireProfile }) {
  const rightMap = new Map(right.indicateurs.map((i) => [i.label, i]))
  const pairs = left.indicateurs
    .filter((i) => rightMap.has(i.label))
    .map((i) => ({ label: i.label, icone: i.icone, left: i, right: rightMap.get(i.label)! }))

  let winsL = 0
  let winsR = 0
  for (const p of pairs) {
    const sL = getScore(p.left.ecart_pct, p.label)
    const sR = getScore(p.right.ecart_pct, p.label)
    if (sL > sR) winsL++
    else if (sR > sL) winsR++
  }

  const leftWinsOverall = winsL > winsR
  const rightWinsOverall = winsR > winsL

  return (
    <div>
      {/* Names + scores */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-center flex-1">
          <div className="text-xl font-bold text-gray-900">{left.nom}</div>
          <div className="text-3xl font-black text-[#000091] mt-1">{winsL}</div>
        </div>
        <div className="text-3xl">⚔️</div>
        <div className="text-center flex-1">
          <div className="text-xl font-bold text-gray-900">{right.nom}</div>
          <div className="text-3xl font-black text-[#000091] mt-1">{winsR}</div>
        </div>
      </div>

      {/* Indicator rows */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
        {pairs.map((p) => (
          <ComparisonRow key={p.label} {...p} />
        ))}
      </div>

      {/* Result */}
      <div
        className={`rounded-xl p-5 text-center font-bold text-lg ${
          leftWinsOverall
            ? 'bg-green-50 border-2 border-green-300 text-green-800'
            : rightWinsOverall
              ? 'bg-green-50 border-2 border-green-300 text-green-800'
              : 'bg-gray-50 border-2 border-gray-300 text-gray-700'
        }`}
      >
        {leftWinsOverall
          ? `🏆 ${left.nom} l'emporte ${winsL} - ${winsR}`
          : rightWinsOverall
            ? `🏆 ${right.nom} l'emporte ${winsR} - ${winsL}`
            : `Égalité ${winsL} - ${winsR} !`}
      </div>
    </div>
  )
}

export default function Versus() {
  const [leftDept, setLeftDept] = useState<{ code: string; nom: string } | null>(null)
  const [rightDept, setRightDept] = useState<{ code: string; nom: string } | null>(null)

  const { data: leftData, isLoading: leftLoading } = useApi<TerritoireProfile>(
    `territoire-${leftDept?.code}`,
    `/territoire/departement/${leftDept?.code}`,
    !!leftDept,
  )
  const { data: rightData, isLoading: rightLoading } = useApi<TerritoireProfile>(
    `territoire-${rightDept?.code}`,
    `/territoire/departement/${rightDept?.code}`,
    !!rightDept,
  )

  const bothSelected = leftDept && rightDept
  const loading = bothSelected && (leftLoading || rightLoading)
  const ready = bothSelected && leftData && rightData

  return (
    <div>
      {/* Header */}
      <div className="bg-[#000091] text-white rounded-xl p-6 mb-6">
        <h1 className="text-3xl font-bold">Comparez deux départements</h1>
        <p className="text-white/70 text-sm mt-2">
          Sélectionnez deux départements pour les comparer indicateur par indicateur
        </p>
      </div>

      {/* Search fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Département A</label>
          <SearchDepartement
            onSelect={(r) => setLeftDept(r)}
            placeholder="Premier département..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Département B</label>
          <SearchDepartement
            onSelect={(r) => setRightDept(r)}
            placeholder="Deuxième département..."
          />
        </div>
      </div>

      {/* States */}
      {!bothSelected && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">⚔️</div>
          <p className="text-lg">Sélectionnez deux départements pour lancer le duel</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <span className="inline-block w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {ready && <ComparisonPanel left={leftData} right={rightData} />}
    </div>
  )
}
