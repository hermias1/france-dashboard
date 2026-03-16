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
  scrutin: 'europeennes-2024', 'presidentielle-2022-t1', 'legislatives-2024-t1'
  niveau: 'region' ou 'departement'
  JOIN: code_geo = departements.code
  Participation = votants::numeric / NULLIF(inscrits, 0) * 100

ÉNERGIE (national, pas par département) :
- energie (date DATE, pic_consommation_mw INT, temperature_moyenne FLOAT) — journalier 2013-2025
- mix_energetique (date DATE, consommation_mw, nucleaire_mw, eolien_mw, solaire_mw, hydraulique_mw, gaz_mw, bioenergies_mw, taux_co2) — production par source

SÉCURITÉ :
- delinquance (code_departement, annee INT, indicateur VARCHAR, nombre INT, taux_pour_mille FLOAT, population INT)
  INDICATEURS EXACTS: 'Cambriolages de logement', 'Homicides', 'Violences physiques hors cadre familial', 'Violences physiques intrafamiliales', 'Violences sexuelles', 'Vols avec armes', 'Destructions et dégradations volontaires', 'Trafic de stupéfiants', 'Usage de stupéfiants', 'Escroqueries et fraudes aux moyens de paiement'
  JOIN: code_departement = departements.code

IMMOBILIER (par commune, agrège par département avec LEFT(code_commune,2)) :
- immobilier (code_commune VARCHAR, annee INT 2018-2024, nb_mutations, prix_moyen, prix_m2_moyen, surface_moyenne)

LOYERS (par commune) :
- loyers (code_commune, nom_commune, code_departement, loyer_m2_moyen)

ACCIDENTS :
- accidents (annee=2024, code_departement, nb_accidents, nb_tues, nb_blesses)

FIBRE :
- fibre (code_commune, nom_commune, code_departement, locaux_total, locaux_ftth, taux_couverture)

ÉDUCATION :
- brevet (session INT, code_departement, nom_departement, nb_etablissements, inscrits, presents, admis, taux_reussite)

SANTÉ :
- apl_medecins (code_commune, nom_commune, code_departement, apl_medecins_generalistes FLOAT, population INT)

EMPLOI :
- chomage (date VARCHAR, code_departement, nom_departement, categorie, nombre INT)

ENVIRONNEMENT :
- desinfo_climat (media VARCHAR, is_public BOOL, cas_desinfo INT, desinfo_par_heure FLOAT)

PRÉCARITÉ :
- precarite (code_departement, nom_departement, revenu_median INT, taux_pauvrete FLOAT %, taux_rsa FLOAT %, taux_chomage_jeunes FLOAT %, salaire_femmes INT €/mois, salaire_hommes INT €/mois)

POLITIQUE :
- elus (type_mandat 'depute'|'senateur'|'maire', code_departement, nom, prenom, sexe 'M'|'F', date_naissance DATE, profession VARCHAR)"""

CLASSIFY_PROMPT = """Tu es un assistant. Classe cette question en UNE catégorie :
- "data" : la question porte sur des données françaises (départements, élections, immobilier, sécurité, énergie, santé, etc.) et peut être répondue par une requête SQL
- "general" : la question est de culture générale, d'opinion, ou ne concerne pas les données disponibles

Réponds UNIQUEMENT avec "data" ou "general"."""

SQL_PROMPT = f"""Génère UNE requête SQL PostgreSQL pour répondre à cette question.

{SCHEMA}

Réponds UNIQUEMENT avec le SQL. Pas de markdown."""

ANALYSIS_PROMPT = """Tu es un data-journaliste français concis. Analyse ces résultats SQL et retourne un JSON avec :
1. "answer": résumé en 2-3 phrases avec chiffres précis
2. "chart": spécification de graphique ou null

Format chart: {"chart_type":"bar|horizontal_bar|line|pie|scatter","title":"...","data":[...],"x_key":"...","y_keys":["..."],"colors":["#2563eb"]}

Réponds UNIQUEMENT avec le JSON valide."""

GENERAL_PROMPT = """Tu es un assistant français cultivé du portail France Dashboard (francedashboard.fr).
Réponds à cette question de manière concise et informative en 2-4 phrases.
Si ta réponse n'est PAS basée sur des données officielles de data.gouv.fr, précise-le clairement."""

MAX_STEPS = 5


async def run_agent(question: str, execute_sql_fn) -> dict:
    """
    Smart agent:
    1. Classify: data question or general?
    2. If data: SQL → Execute → Retry → Analyze
    3. If general or SQL fails: fallback to general knowledge with disclaimer
    """
    steps = []

    # ── Step 0: Classify ──
    try:
        classify_resp = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": CLASSIFY_PROMPT},
                {"role": "user", "content": question},
            ],
            max_tokens=10, temperature=0,
        )
        category = classify_resp.choices[0].message.content.strip().lower()
    except Exception:
        category = "data"  # default to data if classification fails

    steps.append({"sql": f"[Classification: {category}]", "results": [], "error": None})

    # ── General question → direct answer ──
    if "general" in category:
        try:
            resp = await client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": GENERAL_PROMPT},
                    {"role": "user", "content": question},
                ],
                max_tokens=500, temperature=0.3,
            )
            answer = resp.choices[0].message.content.strip()
            return {
                "question": question,
                "steps": steps,
                "answer": f"{answer}\n\n*⚠️ Cette réponse est basée sur des connaissances générales, pas sur les données data.gouv.fr.*",
                "chart": None,
            }
        except Exception as e:
            return {
                "question": question,
                "steps": steps,
                "answer": f"Désolé, je n'ai pas pu répondre à cette question. Erreur: {str(e)}",
                "chart": None,
            }

    # ── Data question → SQL pipeline ──
    messages = [
        {"role": "system", "content": SQL_PROMPT},
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

        try:
            results = await execute_sql_fn(sql)
            steps.append({"sql": sql, "results": results, "error": None})
            break
        except Exception as e:
            error_msg = str(e)
            steps.append({"sql": sql, "results": [], "error": error_msg})
            messages.append({"role": "assistant", "content": sql})
            messages.append({"role": "user", "content": f"Erreur SQL: {error_msg}\nCorrige la requête. Réponds UNIQUEMENT avec le SQL corrigé."})

    # ── SQL failed → fallback to general knowledge ──
    if results is None or (isinstance(results, list) and len(results) == 0):
        try:
            fallback_resp = await client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": GENERAL_PROMPT},
                    {"role": "user", "content": f"La question était: {question}\nJe n'ai pas trouvé de données dans la base. Réponds avec tes connaissances générales."},
                ],
                max_tokens=500, temperature=0.3,
            )
            answer = fallback_resp.choices[0].message.content.strip()
            return {
                "question": question,
                "steps": steps,
                "answer": f"{answer}\n\n*⚠️ Aucune donnée trouvée dans la base. Cette réponse est basée sur des connaissances générales.*",
                "chart": None,
            }
        except Exception:
            return {
                "question": question,
                "steps": steps,
                "answer": "Aucun résultat trouvé pour cette question dans la base de données.",
                "chart": None,
            }

    # ── Analyze results + chart spec ──
    data_str = json.dumps(results[:20], ensure_ascii=False, default=str)

    analysis_response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": ANALYSIS_PROMPT},
            {"role": "user", "content": f"Question: {question}\nSQL: {sql}\nRésultats ({len(results)} lignes):\n{data_str}"},
        ],
        max_tokens=1000, temperature=0.2,
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
