import { useEffect, useState, useCallback } from 'react'

// --- Types ---

type ImmobilierItem = { code_departement: string; nom_departement: string; prix_m2_moyen: number; nb_mutations: number }
type DelinquanceItem = { code_departement: string; nom_departement: string; taux_pour_mille: number }
type ParticipationResult = { code_geo: string; libelle_geo: string; taux_participation: number }
type FibreDept = { code_departement: string; nom_departement: string; taux_couverture_moyen: number }
type AccidentDept = { code_departement: string; nom_departement: string; nb_accidents: number }
type LoyerDept = { code_departement: string; nom_departement: string; loyer_m2_moyen: number }

// --- Question configs ---

interface QuestionConfig {
  text: string
  endpoint: string
  sortKey: string
  sortDir: 'asc' | 'desc'
  answerField: string
  valueField: string
  valueUnit: string
}

const QUESTION_CONFIGS: QuestionConfig[] = [
  {
    text: 'Dans quel département le prix immobilier est-il le plus élevé ?',
    endpoint: '/api/immobilier/departements?annee=2024',
    sortKey: 'prix_m2_moyen',
    sortDir: 'desc',
    answerField: 'nom_departement',
    valueField: 'prix_m2_moyen',
    valueUnit: '€/m²',
  },
  {
    text: 'Quel département a le plus faible taux de cambriolages ?',
    endpoint: '/api/delinquance/departements?annee=2024&indicateur=Cambriolages de logement',
    sortKey: 'taux_pour_mille',
    sortDir: 'asc',
    answerField: 'nom_departement',
    valueField: 'taux_pour_mille',
    valueUnit: '‰',
  },
  {
    text: 'Dans quel département la participation aux européennes 2024 est-elle la plus forte ?',
    endpoint: '/api/elections/participation?scrutin=europeennes-2024&niveau=departement',
    sortKey: 'taux_participation',
    sortDir: 'desc',
    answerField: 'libelle_geo',
    valueField: 'taux_participation',
    valueUnit: '%',
  },
  {
    text: 'Quel département a la meilleure couverture fibre ?',
    endpoint: '/api/fibre/departements',
    sortKey: 'taux_couverture_moyen',
    sortDir: 'desc',
    answerField: 'nom_departement',
    valueField: 'taux_couverture_moyen',
    valueUnit: '%',
  },
  {
    text: "Quel département a le plus d'accidents de la route ?",
    endpoint: '/api/accidents/departements?annee=2024',
    sortKey: 'nb_accidents',
    sortDir: 'desc',
    answerField: 'nom_departement',
    valueField: 'nb_accidents',
    valueUnit: 'accidents',
  },
  {
    text: 'Quel département a le loyer le plus bas ?',
    endpoint: '/api/loyers/departements',
    sortKey: 'loyer_m2_moyen',
    sortDir: 'asc',
    answerField: 'nom_departement',
    valueField: 'loyer_m2_moyen',
    valueUnit: '€/m²',
  },
  // --- More questions ---
  {
    text: 'Quel département a le loyer le plus élevé ?',
    endpoint: '/api/loyers/departements',
    sortKey: 'loyer_m2_moyen',
    sortDir: 'desc',
    answerField: 'nom_departement',
    valueField: 'loyer_m2_moyen',
    valueUnit: '€/m²',
  },
  {
    text: 'Quel département a le prix immobilier le plus bas ?',
    endpoint: '/api/immobilier/departements?annee=2024',
    sortKey: 'prix_m2_moyen',
    sortDir: 'asc',
    answerField: 'nom_departement',
    valueField: 'prix_m2_moyen',
    valueUnit: '€/m²',
  },
  {
    text: 'Quel département a le plus de cambriolages par habitant ?',
    endpoint: '/api/delinquance/departements?annee=2024&indicateur=Cambriolages de logement',
    sortKey: 'taux_pour_mille',
    sortDir: 'desc',
    answerField: 'nom_departement',
    valueField: 'taux_pour_mille',
    valueUnit: '‰',
  },
  {
    text: 'Quel département a la plus faible participation aux européennes 2024 ?',
    endpoint: '/api/elections/participation?scrutin=europeennes-2024&niveau=departement',
    sortKey: 'taux_participation',
    sortDir: 'asc',
    answerField: 'libelle_geo',
    valueField: 'taux_participation',
    valueUnit: '%',
  },
  {
    text: 'Quel département a la plus faible couverture fibre ?',
    endpoint: '/api/fibre/departements',
    sortKey: 'taux_couverture_moyen',
    sortDir: 'asc',
    answerField: 'nom_departement',
    valueField: 'taux_couverture_moyen',
    valueUnit: '%',
  },
  {
    text: "Quel département a le moins d'accidents de la route ?",
    endpoint: '/api/accidents/departements?annee=2024',
    sortKey: 'nb_accidents',
    sortDir: 'asc',
    answerField: 'nom_departement',
    valueField: 'nb_accidents',
    valueUnit: 'accidents',
  },
  {
    text: 'Quel département a le meilleur accès aux médecins généralistes ?',
    endpoint: '/api/sante/medecins',
    sortKey: 'apl_moyen',
    sortDir: 'desc',
    answerField: 'nom_departement',
    valueField: 'apl_moyen',
    valueUnit: 'APL',
  },
  {
    text: 'Quel département est le plus grand désert médical ?',
    endpoint: '/api/sante/medecins',
    sortKey: 'apl_moyen',
    sortDir: 'asc',
    answerField: 'nom_departement',
    valueField: 'apl_moyen',
    valueUnit: 'APL',
  },
  {
    text: 'Quel département a le meilleur taux de réussite au brevet ?',
    endpoint: '/api/education/brevet',
    sortKey: 'taux_reussite',
    sortDir: 'desc',
    answerField: 'nom_departement',
    valueField: 'taux_reussite',
    valueUnit: '%',
  },
  {
    text: 'Quel département a le plus faible taux de réussite au brevet ?',
    endpoint: '/api/education/brevet',
    sortKey: 'taux_reussite',
    sortDir: 'asc',
    answerField: 'nom_departement',
    valueField: 'taux_reussite',
    valueUnit: '%',
  },
  {
    text: 'Où les maires sont-ils les plus paritaires (% de femmes) ?',
    endpoint: '/api/politique/parite-departement',
    sortKey: 'pct_femmes_maires',
    sortDir: 'desc',
    answerField: 'nom_departement',
    valueField: 'pct_femmes_maires',
    valueUnit: '%',
  },
  {
    text: 'Où les maires sont-ils les moins paritaires ?',
    endpoint: '/api/politique/parite-departement',
    sortKey: 'pct_femmes_maires',
    sortDir: 'asc',
    answerField: 'nom_departement',
    valueField: 'pct_femmes_maires',
    valueUnit: '%',
  },
  {
    text: 'Quel département a le plus de violences physiques par habitant ?',
    endpoint: '/api/delinquance/departements?annee=2024&indicateur=Violences physiques hors cadre familial',
    sortKey: 'taux_pour_mille',
    sortDir: 'desc',
    answerField: 'nom_departement',
    valueField: 'taux_pour_mille',
    valueUnit: '‰',
  },
  {
    text: 'Quel département a le moins de violences physiques par habitant ?',
    endpoint: '/api/delinquance/departements?annee=2024&indicateur=Violences physiques hors cadre familial',
    sortKey: 'taux_pour_mille',
    sortDir: 'asc',
    answerField: 'nom_departement',
    valueField: 'taux_pour_mille',
    valueUnit: '‰',
  },
  {
    text: 'Quel département a le plus de trafic de stupéfiants ?',
    endpoint: '/api/delinquance/departements?annee=2024&indicateur=Trafic de stupéfiants',
    sortKey: 'taux_pour_mille',
    sortDir: 'desc',
    answerField: 'nom_departement',
    valueField: 'taux_pour_mille',
    valueUnit: '‰',
  },
  {
    text: 'Quel département a le plus d\'escroqueries ?',
    endpoint: '/api/delinquance/departements?annee=2024&indicateur=Escroqueries et fraudes aux moyens de paiement',
    sortKey: 'taux_pour_mille',
    sortDir: 'desc',
    answerField: 'nom_departement',
    valueField: 'taux_pour_mille',
    valueUnit: '‰',
  },
]

const LABELS = ['A', 'B', 'C', 'D']
const TOTAL_QUESTIONS = 10

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatValue(v: number, unit: string): string {
  if (unit === '%') return `${v.toFixed(1)} %`
  if (unit === '‰') return `${v.toFixed(2)} ‰`
  if (unit === '€/m²') return `${Math.round(v).toLocaleString('fr-FR')} €/m²`
  return `${v.toLocaleString('fr-FR')} ${unit}`
}

interface GeneratedQuestion {
  text: string
  options: string[]
  correctIndex: number
  correctValue: string
}

// --- Component ---

export default function Quiz() {
  const [datasets, setDatasets] = useState<Record<string, Record<string, unknown>[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [question, setQuestion] = useState<GeneratedQuestion | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [finished, setFinished] = useState(false)

  // Fetch all datasets once
  useEffect(() => {
    const endpoints = QUESTION_CONFIGS.map((c) => c.endpoint)
    Promise.all(
      endpoints.map((url) =>
        fetch(url)
          .then((r) => r.json())
          .then((data) => ({ url, data: Array.isArray(data) ? data : (data.data ?? data.results ?? []) }))
          .catch(() => ({ url, data: [] }))
      )
    ).then((results) => {
      const map: Record<string, Record<string, unknown>[]> = {}
      for (const r of results) map[r.url] = r.data
      setDatasets(map)
      setLoading(false)
    }).catch(() => {
      setError('Impossible de charger les données.')
      setLoading(false)
    })
  }, [])

  const generateQuestion = useCallback((): GeneratedQuestion | null => {
    if (!datasets) return null
    const config = QUESTION_CONFIGS[Math.floor(Math.random() * QUESTION_CONFIGS.length)]
    const data = datasets[config.endpoint]
    if (!data || data.length < 4) return null

    const sorted = [...data].sort((a, b) => {
      const va = Number(a[config.sortKey]) || 0
      const vb = Number(b[config.sortKey]) || 0
      return config.sortDir === 'desc' ? vb - va : va - vb
    })

    const correct = sorted[0]
    const rest = sorted.slice(1)
    const distractors = shuffle(rest).slice(0, 3)
    const allOptions = shuffle([correct, ...distractors])
    const correctIdx = allOptions.indexOf(correct)

    return {
      text: config.text,
      options: allOptions.map((o) => String(o[config.answerField] ?? '?')),
      correctIndex: correctIdx,
      correctValue: formatValue(Number(correct[config.valueField]) || 0, config.valueUnit),
    }
  }, [datasets])

  // Generate first question once data is loaded
  useEffect(() => {
    if (datasets && !question && questionNumber === 0) {
      setQuestion(generateQuestion())
      setQuestionNumber(1)
    }
  }, [datasets, question, questionNumber, generateQuestion])

  const handleAnswer = (idx: number) => {
    if (selectedIndex !== null) return
    setSelectedIndex(idx)
    if (idx === question?.correctIndex) {
      setScore((s) => s + 1)
    }
  }

  const handleNext = () => {
    if (questionNumber >= TOTAL_QUESTIONS) {
      setFinished(true)
      return
    }
    setSelectedIndex(null)
    setQuestion(generateQuestion())
    setQuestionNumber((n) => n + 1)
  }

  const handleRestart = () => {
    setScore(0)
    setQuestionNumber(1)
    setSelectedIndex(null)
    setFinished(false)
    setQuestion(generateQuestion())
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl animate-bounce mb-4">🎯</div>
          <p className="text-lg text-gray-500">Chargement du quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    )
  }

  if (finished) {
    const ratio = score / TOTAL_QUESTIONS
    const message =
      ratio >= 0.8 ? 'Expert ! Vous connaissez la France sur le bout des doigts.' :
      ratio >= 0.5 ? 'Pas mal ! Vous avez de bonnes bases.' :
      'Révisez vos données ! La France a encore des secrets pour vous.'
    const emoji = ratio >= 0.8 ? '🏆' : ratio >= 0.5 ? '👏' : '📚'

    return (
      <div className="max-w-xl mx-auto mt-12 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-10">
          <div className="text-6xl mb-6">{emoji}</div>
          <h2 className="text-2xl font-bold text-[#000091] mb-2">
            Votre score : {score}/{TOTAL_QUESTIONS}
          </h2>
          <p className="text-gray-600 text-lg mb-8">{message}</p>
          <button
            onClick={handleRestart}
            className="bg-[#000091] text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-[#0000b8] transition-colors"
          >
            Recommencer
          </button>
        </div>
      </div>
    )
  }

  if (!question) return null

  const answered = selectedIndex !== null
  const isCorrect = selectedIndex === question.correctIndex

  return (
    <div className="max-w-xl mx-auto mt-8">
      {/* Header */}
      <div className="bg-[#000091] text-white rounded-t-2xl px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-wide">🎯 QUIZ — CONNAISSEZ-VOUS LA FRANCE ?</h1>
        <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
          Score : {score}/{questionNumber}
        </span>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-b-2xl shadow-lg p-6">
        <p className="text-xs text-gray-400 mb-2">Question {questionNumber}/{TOTAL_QUESTIONS}</p>
        <h2 className="text-xl font-semibold text-gray-800 mb-6">{question.text}</h2>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((opt, idx) => {
            let classes = 'w-full text-left px-5 py-4 rounded-xl text-base font-medium transition-all border-2 '
            if (!answered) {
              classes += 'border-gray-200 hover:border-[#000091] hover:bg-blue-50 cursor-pointer'
            } else if (idx === question.correctIndex) {
              classes += 'border-green-500 bg-green-50 text-green-800'
            } else if (idx === selectedIndex) {
              classes += 'border-red-500 bg-red-50 text-red-800'
            } else {
              classes += 'border-gray-100 text-gray-400'
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={answered}
                className={classes}
              >
                <span className="inline-block w-8 font-bold text-gray-400">[{LABELS[idx]}]</span>
                {opt}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {answered && (
          <div className="mt-6">
            <div
              className={`p-4 rounded-xl text-base font-medium ${
                isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {isCorrect
                ? `✅ Bonne réponse ! ${question.options[question.correctIndex]} avec ${question.correctValue}`
                : `❌ Mauvaise réponse ! C'était ${question.options[question.correctIndex]} avec ${question.correctValue}`}
            </div>
            <button
              onClick={handleNext}
              className="mt-4 w-full bg-[#000091] text-white py-3 rounded-xl text-base font-semibold hover:bg-[#0000b8] transition-colors"
            >
              {questionNumber >= TOTAL_QUESTIONS ? 'Voir le résultat' : 'Suivante →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
