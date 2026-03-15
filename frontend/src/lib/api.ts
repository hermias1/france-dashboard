const API_BASE = '/api'

export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export interface ElectionResult {
  code_geo: string
  libelle_geo: string
  liste: string
  nuance: string
  voix: number
  pct_voix_exprimes: number
  sieges: number
}

export interface ParticipationResult {
  code_geo: string
  libelle_geo: string
  inscrits: number
  votants: number
  exprimes: number
  taux_participation: number
}

export interface EnergiePoint {
  date: string
  pic_consommation_mw: number | null
  temperature_moyenne: number | null
  temperature_reference: number | null
}

export interface GeoRegion {
  code: string
  nom: string
}

export interface DelinquanceItem {
  code_departement: string
  nom_departement: string
  indicateur: string
  nombre: number
  taux_pour_mille: number
  population: number
}

export interface ImmobilierItem {
  code_departement: string
  nom_departement: string
  prix_m2_moyen: number
  nb_mutations: number
}
