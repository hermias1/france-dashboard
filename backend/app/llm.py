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
  - Indicateurs : Homicides, Coups et blessures volontaires, Violences sexuelles, Vols avec armes, Vols violents sans arme, Vols sans violence contre des personnes, Cambriolages de logement, Vols de véhicules, Vols dans les véhicules, Vols d'accessoires sur véhicules, Destructions et dégradations volontaires, Trafic de stupéfiants, Usage de stupéfiants, Escroqueries, etc.
TABLE immobilier (id SERIAL PK, code_commune VARCHAR, annee INT, nb_mutations INT, nb_maisons INT, nb_apparts INT, prix_moyen INT, prix_m2_moyen INT, surface_moyenne INT)
  - UNIQUE(code_commune, annee)
  - Par commune (code INSEE 5 chiffres), données 2024
  - LEFT(code_commune, 2) = code département pour jointures

Utilise l'outil execute_sql pour requêter la base. Tu peux faire plusieurs requêtes pour explorer les données avant de répondre.
Pour les pourcentages de participation : votants::numeric / NULLIF(inscrits, 0) * 100
Réponds toujours en français, de manière factuelle avec des chiffres précis, en 2-5 phrases."""

TOOLS = [{
    "type": "function",
    "function": {
        "name": "execute_sql",
        "description": "Exécute une requête SQL SELECT sur la base PostgreSQL des statistiques françaises. Retourne les résultats en JSON.",
        "parameters": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "La requête SQL PostgreSQL (SELECT uniquement)"
                }
            },
            "required": ["sql"]
        }
    }
}]

MAX_ITERATIONS = 5


async def run_agent(question: str, execute_sql_fn) -> dict:
    """
    Run an agentic loop: the LLM can call execute_sql multiple times
    before producing a final answer.

    Returns: {question, steps: [{sql, results}], answer}
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]
    steps = []

    for _ in range(MAX_ITERATIONS):
        response = await client.chat.completions.create(
            model=MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            max_tokens=1000,
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
            }

        # Process each tool call
        messages.append(message)
        for tool_call in message.tool_calls:
            args = json.loads(tool_call.function.arguments)
            sql = args.get("sql", "")

            # Execute the SQL
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

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": tool_result,
            })

    # If we hit max iterations, return what we have
    return {
        "question": question,
        "steps": steps,
        "answer": "Analyse interrompue après trop d'itérations.",
    }
