import json
import os
from openai import AsyncOpenAI

client = AsyncOpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ.get("NVIDIA_NIM_API_KEY", ""),
)

MODEL = "qwen/qwen3-coder-480b-a35b-instruct"

SYSTEM_PROMPT = """Tu es un assistant data-journaliste français spécialisé dans l'analyse des données publiques.
Tu as accès à une base PostgreSQL avec les tables suivantes :

TABLE regions (code VARCHAR PK, nom VARCHAR)
TABLE departements (code VARCHAR PK, nom VARCHAR, region_code VARCHAR FK→regions)
TABLE elections (id SERIAL PK, scrutin VARCHAR, date DATE, niveau VARCHAR ['region','departement'], code_geo VARCHAR, libelle_geo VARCHAR, inscrits INT, votants INT, exprimes INT, blancs INT, nuls INT, liste VARCHAR, nuance VARCHAR, voix INT, pct_voix_exprimes FLOAT, sieges INT)
  - UNIQUE(scrutin, niveau, code_geo, liste)
  - scrutin disponible: 'europeennes-2024'
  - nuances: LRN (RN), LENS (Renaissance/Macron), LFI (France Insoumise), LVEC (Écologie), LLR (LR), LUG (PS/Place Publique), LREC (Reconquête), LCOM (PCF), etc.
TABLE energie (id SERIAL PK, date DATE UNIQUE, pic_consommation_mw INT, temperature_moyenne FLOAT, temperature_reference FLOAT)
  - Données nationales uniquement (pas par région)
  - Données journalières de 2013 à 2025
TABLE delinquance (id SERIAL PK, code_departement VARCHAR, annee INT, indicateur VARCHAR, nombre INT, taux_pour_mille FLOAT, population INT)
  - UNIQUE(code_departement, annee, indicateur)
  - Par département, de 2016 à 2025
  - Indicateurs : Homicides, Violences physiques hors cadre familial, Violences physiques intrafamiliales, Violences sexuelles, Vols avec armes, Vols violents sans arme, Vols sans violence contre des personnes, Cambriolages de logement, Vols de véhicules, Destructions et dégradations volontaires, Trafic de stupéfiants, Usage de stupéfiants, Escroqueries, etc.
TABLE immobilier (id SERIAL PK, code_commune VARCHAR, annee INT, nb_mutations INT, nb_maisons INT, nb_apparts INT, prix_moyen INT, prix_m2_moyen INT, surface_moyenne INT)
  - UNIQUE(code_commune, annee)
  - Par commune (code INSEE 5 chiffres), données 2024
  - LEFT(code_commune, 2) = code département pour jointures

Tu as 2 outils :
1. execute_sql : pour requêter la base. Tu peux faire plusieurs requêtes.
2. generate_chart : pour générer un graphique à partir des données. UTILISE-LE TOUJOURS pour accompagner ta réponse d'une visualisation.

Pour les pourcentages de participation : votants::numeric / NULLIF(inscrits, 0) * 100

Workflow :
1. Exécute les requêtes SQL nécessaires
2. Analyse les résultats
3. Appelle generate_chart avec les données pour créer un graphique pertinent
4. Réponds en français avec des chiffres précis"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "execute_sql",
            "description": "Exécute une requête SQL SELECT sur la base PostgreSQL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "sql": {"type": "string", "description": "La requête SQL PostgreSQL (SELECT uniquement)"}
                },
                "required": ["sql"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_chart",
            "description": "Génère un graphique à afficher à l'utilisateur. Appelle cet outil après avoir obtenu les résultats SQL.",
            "parameters": {
                "type": "object",
                "properties": {
                    "chart_type": {
                        "type": "string",
                        "enum": ["bar", "horizontal_bar", "line", "pie", "scatter"],
                        "description": "Type de graphique. bar=barres verticales, horizontal_bar=barres horizontales (bon pour classements), line=courbe temporelle, pie=camembert, scatter=nuage de points (corrélations)"
                    },
                    "title": {
                        "type": "string",
                        "description": "Titre du graphique"
                    },
                    "data": {
                        "type": "array",
                        "items": {"type": "object"},
                        "description": "Données du graphique. Chaque objet = un point. Ex: [{\"region\": \"Bretagne\", \"taux\": 57.1}, ...]"
                    },
                    "x_key": {
                        "type": "string",
                        "description": "Clé pour l'axe X (catégorie ou date)"
                    },
                    "y_keys": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Clés pour l'axe Y (une ou plusieurs séries). Ex: [\"taux\"] ou [\"voix_rn\", \"voix_lfi\"]"
                    },
                    "colors": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Couleurs hex pour chaque série Y. Ex: [\"#2563eb\", \"#dc2626\"]"
                    },
                    "x_label": {"type": "string", "description": "Label de l'axe X"},
                    "y_label": {"type": "string", "description": "Label de l'axe Y"}
                },
                "required": ["chart_type", "title", "data", "x_key", "y_keys"]
            }
        }
    }
]

MAX_ITERATIONS = 7


async def run_agent(question: str, execute_sql_fn) -> dict:
    """
    Run an agentic loop: the LLM can call execute_sql and generate_chart
    multiple times before producing a final answer.

    Returns: {question, steps: [{sql, results}], answer, chart}
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]
    steps = []
    chart = None

    for _ in range(MAX_ITERATIONS):
        response = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            max_tokens=2000,
            temperature=0,
        )

        choice = response.choices[0]
        message = choice.message

        # If no tool calls, we have the final answer
        if not message.tool_calls:
            return {
                "question": question,
                "steps": steps,
                "answer": message.content or "Pas de réponse.",
                "chart": chart,
            }

        # Process each tool call
        messages.append(message)
        for tool_call in message.tool_calls:
            fn_name = tool_call.function.name
            args = json.loads(tool_call.function.arguments)

            if fn_name == "execute_sql":
                sql = args.get("sql", "")
                step_results = []
                step_error = None
                try:
                    step_results = await execute_sql_fn(sql)
                    tool_result = json.dumps(step_results[:50], ensure_ascii=False, default=str)
                    if len(step_results) > 50:
                        tool_result += f"\n... ({len(step_results)} résultats au total)"
                except Exception as exc:
                    step_error = str(exc)
                    tool_result = json.dumps({"error": step_error}, ensure_ascii=False)

                steps.append({"sql": sql, "results": step_results, "error": step_error})

            elif fn_name == "generate_chart":
                chart = {
                    "chart_type": args.get("chart_type", "bar"),
                    "title": args.get("title", ""),
                    "data": args.get("data", []),
                    "x_key": args.get("x_key", ""),
                    "y_keys": args.get("y_keys", []),
                    "colors": args.get("colors", ["#2563eb"]),
                    "x_label": args.get("x_label", ""),
                    "y_label": args.get("y_label", ""),
                }
                tool_result = json.dumps({"status": "chart generated", "type": chart["chart_type"]})

            else:
                tool_result = json.dumps({"error": f"Unknown tool: {fn_name}"})

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": tool_result,
            })

    return {
        "question": question,
        "steps": steps,
        "answer": "Analyse interrompue après trop d'itérations.",
        "chart": chart,
    }
