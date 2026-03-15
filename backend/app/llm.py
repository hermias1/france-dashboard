import json
import os
from openai import AsyncOpenAI

# Default: NVIDIA NIM. Override with OLLAMA_URL for local model.
OLLAMA_URL = os.environ.get("OLLAMA_URL")

if OLLAMA_URL:
    client = AsyncOpenAI(base_url=f"{OLLAMA_URL}/v1", api_key="ollama")
    MODEL = os.environ.get("LLM_MODEL", "qwen2.5-coder:7b")
else:
    client = AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.environ.get("NVIDIA_NIM_API_KEY", ""),
    )
    MODEL = os.environ.get("LLM_MODEL", "qwen/qwen3.5-122b-a10b")

SQL_PROMPT = """Génère UNE requête SQL PostgreSQL pour répondre à cette question.

Tables :
- regions (code, nom)
- departements (code, nom, region_code)
- elections (scrutin='europeennes-2024', niveau='region'|'departement', code_geo, libelle_geo, inscrits, votants, exprimes, liste, nuance[LRN,LENS,LFI,LVEC,LLR,LUG,LREC...], voix, pct_voix_exprimes)
- energie (date, pic_consommation_mw, temperature_moyenne) — national, journalier, 2013-2025
- delinquance (code_departement, annee[2016-2025], indicateur, nombre, taux_pour_mille, population)
- immobilier (code_commune, annee=2024, nb_mutations, prix_moyen, prix_m2_moyen, surface_moyenne) — LEFT(code_commune,2)=code dept

Participation = votants::numeric / NULLIF(inscrits, 0) * 100
Réponds UNIQUEMENT avec le SQL. Pas de markdown, pas d'explication."""

ANALYSIS_PROMPT = """Tu es un data-journaliste français concis. Analyse ces résultats SQL et retourne un JSON avec :
1. "answer": résumé en 2-3 phrases avec chiffres précis
2. "chart": spécification de graphique ou null

Format chart: {"chart_type":"bar|horizontal_bar|line|pie|scatter","title":"...","data":[...],"x_key":"...","y_keys":["..."],"colors":["#2563eb"]}

Réponds UNIQUEMENT avec le JSON valide, rien d'autre."""


async def run_agent(question: str, execute_sql_fn) -> dict:
    """Two-step: 1) SQL generation, 2) analysis + chart spec."""
    steps = []

    # Step 1: Generate SQL
    sql_response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SQL_PROMPT},
            {"role": "user", "content": question},
        ],
        max_tokens=500,
        temperature=0,
    )
    sql = sql_response.choices[0].message.content.strip()
    sql = sql.replace("```sql", "").replace("```", "").strip()

    # Step 2: Execute SQL
    step_results = []
    step_error = None
    try:
        step_results = await execute_sql_fn(sql)
    except Exception as exc:
        step_error = str(exc)

    steps.append({"sql": sql, "results": step_results, "error": step_error})

    if step_error or not step_results:
        return {
            "question": question,
            "steps": steps,
            "answer": f"Erreur SQL: {step_error}" if step_error else "Aucun résultat trouvé.",
            "chart": None,
        }

    # Step 3: Analyze + generate chart spec
    data_str = json.dumps(step_results[:20], ensure_ascii=False, default=str)

    analysis_response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": ANALYSIS_PROMPT},
            {"role": "user", "content": f"Question: {question}\nSQL: {sql}\nRésultats ({len(step_results)} lignes):\n{data_str}"},
        ],
        max_tokens=1000,
        temperature=0.2,
    )
    raw = analysis_response.choices[0].message.content.strip()

    # Parse JSON response
    answer = ""
    chart = None
    try:
        # Clean markdown wrapping
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        parsed = json.loads(raw)
        answer = parsed.get("answer", "")
        chart = parsed.get("chart")
    except (json.JSONDecodeError, AttributeError):
        # Fallback: treat as plain text answer
        answer = raw

    return {
        "question": question,
        "steps": steps,
        "answer": answer,
        "chart": chart,
    }
