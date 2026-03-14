import os
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ.get("NVIDIA_NIM_API_KEY", ""),
)

MODEL = "meta/llama-3.3-70b-instruct"

SCHEMA_CONTEXT = """
Tu es un assistant qui transforme des questions en français sur les données publiques françaises en requêtes SQL PostgreSQL.

Voici le schéma de la base de données :

TABLE regions (code VARCHAR PK, nom VARCHAR)
TABLE departements (code VARCHAR PK, nom VARCHAR, region_code VARCHAR FK→regions)
TABLE elections (id SERIAL PK, scrutin VARCHAR, date DATE, niveau VARCHAR, code_geo VARCHAR, libelle_geo VARCHAR, inscrits INT, votants INT, exprimes INT, blancs INT, nuls INT, liste VARCHAR, nuance VARCHAR, voix INT, pct_voix_exprimes FLOAT, sieges INT)
  - UNIQUE(scrutin, niveau, code_geo, liste)
  - scrutin: 'europeennes-2024'
  - niveau: 'region' ou 'departement'
  - nuance: LRN (RN), LENS (Renaissance), LFI, LVEC (Écologie), LLR (LR), LUG (PS/Place Publique), LREC (Reconquête), LCOM (PCF), LEXG, LEXD, LDIV, etc.
TABLE energie (id SERIAL PK, date DATE UNIQUE, pic_consommation_mw INT, temperature_moyenne FLOAT, temperature_reference FLOAT)
  - Données nationales uniquement (pas par région)
  - Données journalières de 2013 à 2025

Règles :
- Génère UNIQUEMENT la requête SQL, sans explication, sans markdown, sans ```
- Utilise uniquement SELECT (lecture seule)
- LIMIT 50 par défaut sauf si la question demande un classement spécifique
- Pour les pourcentages de participation, calcule : votants::numeric / NULLIF(inscrits, 0) * 100
- Les données énergie sont nationales, pas liées aux régions/départements
"""


async def question_to_sql(question: str) -> str:
    """Convert a natural language question to SQL."""
    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SCHEMA_CONTEXT},
            {"role": "user", "content": question},
        ],
        max_tokens=500,
        temperature=0,
    )
    sql = response.choices[0].message.content.strip()
    # Clean up any markdown formatting the LLM might add
    sql = sql.replace("```sql", "").replace("```", "").strip()
    return sql


async def summarize_results(question: str, sql: str, results: list[dict]) -> str:
    """Generate a natural language summary of query results."""
    results_preview = str(results[:20])
    if len(results) > 20:
        results_preview += f"\n... ({len(results)} résultats au total)"

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "Tu es un assistant data-journaliste français. "
                    "Résume les résultats de cette requête de manière claire et concise, en 2-3 phrases. "
                    "Utilise des chiffres précis. Sois factuel."
                ),
            },
            {
                "role": "user",
                "content": f"Question : {question}\nSQL : {sql}\nRésultats : {results_preview}",
            },
        ],
        max_tokens=300,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()
