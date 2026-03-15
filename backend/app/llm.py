import json
import os
from openai import AsyncOpenAI

OLLAMA_URL = os.environ.get("OLLAMA_URL", "").strip() or None

if OLLAMA_URL:
    client = AsyncOpenAI(base_url=f"{OLLAMA_URL}/v1", api_key="ollama")
    MODEL = os.environ.get("LLM_MODEL", "").strip() or "qwen2.5-coder:7b"
else:
    client = AsyncOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=os.environ.get("NVIDIA_NIM_API_KEY", ""),
    )
    MODEL = os.environ.get("LLM_MODEL", "").strip() or "qwen/qwen2.5-coder-32b-instruct"

SCHEMA = """Tables PostgreSQL (ATTENTION: utilise UNIQUEMENT ces tables, pas d'autres) :

RÉFÉRENTIEL GÉO :
- departements (code VARCHAR PK, nom, region_code) — 101 départements
- regions (code VARCHAR PK, nom) — 18 régions
NOTE: la table communes EXISTE mais est VIDE. Pour les noms de départements, JOIN avec departements.

ÉLECTIONS :
- elections (scrutin, niveau, code_geo, libelle_geo, inscrits, votants, exprimes, liste, nuance, voix, pct_voix_exprimes)
  scrutin: 'europeennes-2024', 'presidentielle-2022-t1' ou 'legislatives-2024-t1'
  niveau: 'region' ou 'departement'
  JOIN: code_geo = departements.code
  Participation = votants::numeric / NULLIF(inscrits, 0) * 100

ÉNERGIE (national, pas par département) :
- energie (date DATE, pic_consommation_mw INT, temperature_moyenne FLOAT) — journalier 2013-2025

SÉCURITÉ :
- delinquance (code_departement, annee INT, indicateur VARCHAR, nombre INT, taux_pour_mille FLOAT, population INT)
  INDICATEURS EXACTS: 'Cambriolages de logement', 'Homicides', 'Violences physiques hors cadre familial', 'Violences physiques intrafamiliales', 'Violences sexuelles', 'Vols avec armes', 'Vols sans violence contre des personnes', 'Destructions et dégradations volontaires', 'Trafic de stupéfiants', 'Usage de stupéfiants', 'Escroqueries et fraudes aux moyens de paiement'
  JOIN: code_departement = departements.code

IMMOBILIER (par commune, agrège par département avec LEFT(code_commune,2)) :
- immobilier (code_commune VARCHAR, annee INT 2018-2024, nb_mutations, prix_moyen, prix_m2_moyen, surface_moyenne)
  Pour département: LEFT(code_commune, 2) = departements.code

LOYERS (par commune) :
- loyers (code_commune, nom_commune, code_departement, loyer_m2_moyen)

ACCIDENTS :
- accidents (annee=2024, code_departement, nb_accidents, nb_tues, nb_blesses)

FIBRE :
- fibre (code_commune, nom_commune, code_departement, locaux_total, locaux_ftth, taux_couverture)

ÉDUCATION :
- brevet (session INT, code_departement, nom_departement, nb_etablissements, inscrits, presents, admis, taux_reussite)

SANTÉ :
- apl_medecins (code_commune, nom_commune, code_departement, apl_medecins_generalistes FLOAT, population INT) — APL = consultations accessibles pour 100K hab

EMPLOI :
- chomage (date VARCHAR ex '2024-12', code_departement, nom_departement, categorie='ABC', nombre INT) — demandeurs d'emploi fin de mois par département
  JOIN: code_departement = departements.code

ENVIRONNEMENT :
- desinfo_climat (media VARCHAR, is_public BOOL, is_info_continu BOOL, is_radio BOOL, couverture_climat FLOAT, cas_desinfo INT, desinfo_par_heure FLOAT) — 18 médias audiovisuels

POLITIQUE (élus) :
- elus (type_mandat VARCHAR 'depute'|'senateur'|'maire', code_departement, nom, prenom, sexe 'M'|'F', date_naissance DATE, profession VARCHAR, date_debut_mandat DATE, circonscription VARCHAR)
  UNIQUE (type_mandat, nom, prenom, code_departement)
  JOIN: code_departement = departements.code
  Age: EXTRACT(YEAR FROM AGE(date_naissance))"""

MAX_STEPS = 5


async def run_agent(question: str, execute_sql_fn) -> dict:
    """
    Real agent loop:
    1. Generate SQL
    2. Execute — if error, send error to LLM for correction (up to 3 retries)
    3. Analyze results + generate chart spec
    """
    steps = []

    # ── Step 1: Generate SQL ──
    messages = [
        {"role": "system", "content": f"Tu es un expert SQL PostgreSQL. Génère UNE requête SQL pour répondre à cette question.\n\n{SCHEMA}\n\nRéponds UNIQUEMENT avec le SQL. Pas de markdown."},
        {"role": "user", "content": question},
    ]

    sql = None
    results = None

    for attempt in range(MAX_STEPS):
        response = await client.chat.completions.create(
            model=MODEL, messages=messages, max_tokens=500, temperature=0,
        )
        raw = response.choices[0].message.content.strip()
        sql = raw.replace("```sql", "").replace("```", "").strip()

        # Execute
        try:
            results = await execute_sql_fn(sql)
            steps.append({"sql": sql, "results": results, "error": None})
            break
        except Exception as e:
            error_msg = str(e)
            steps.append({"sql": sql, "results": [], "error": error_msg})

            # Feed error back to LLM for correction
            messages.append({"role": "assistant", "content": sql})
            messages.append({"role": "user", "content": f"Erreur SQL: {error_msg}\nCorrige la requête. Réponds UNIQUEMENT avec le SQL corrigé."})

    if results is None:
        return {
            "question": question,
            "steps": steps,
            "answer": f"Impossible d'exécuter la requête après {MAX_STEPS} tentatives.",
            "chart": None,
        }

    if not results:
        return {
            "question": question,
            "steps": steps,
            "answer": "Aucun résultat trouvé pour cette question.",
            "chart": None,
        }

    # ── Step 2: Analyze + chart spec ──
    data_str = json.dumps(results[:20], ensure_ascii=False, default=str)

    analysis_response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": """Tu es un data-journaliste français concis. Analyse ces résultats SQL et retourne un JSON avec :
1. "answer": résumé en 2-3 phrases avec chiffres précis
2. "chart": spécification de graphique ou null

Format chart: {"chart_type":"bar|horizontal_bar|line|pie|scatter","title":"...","data":[...],"x_key":"...","y_keys":["..."],"colors":["#2563eb"]}

Réponds UNIQUEMENT avec le JSON valide."""},
            {"role": "user", "content": f"Question: {question}\nSQL: {sql}\nRésultats ({len(results)} lignes):\n{data_str}"},
        ],
        max_tokens=1000,
        temperature=0.2,
    )
    raw = analysis_response.choices[0].message.content.strip()

    answer = ""
    chart = None
    try:
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        parsed = json.loads(raw)
        answer = parsed.get("answer", "")
        chart = parsed.get("chart")
    except (json.JSONDecodeError, AttributeError):
        answer = raw

    return {
        "question": question,
        "steps": steps,
        "answer": answer,
        "chart": chart,
    }
