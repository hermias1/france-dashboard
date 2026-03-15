import math
from fastapi import APIRouter
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/insights", tags=["insights"])


class Insight(BaseModel):
    title: str
    description: str
    correlation: float
    indicator_x: str
    indicator_y: str
    icon: str


# All indicators we can extract at department level
INDICATORS = [
    {
        "key": "prix_immo",
        "label": "Prix immobilier (€/m²)",
        "icon": "🏠",
        "sql": """SELECT LEFT(code_commune, 2) as dept, AVG(prix_m2_moyen) as val
                  FROM immobilier WHERE prix_m2_moyen > 0 AND annee = 2024
                  GROUP BY LEFT(code_commune, 2)""",
        "higher_is": "cher",
    },
    {
        "key": "loyer",
        "label": "Loyer (€/m²)",
        "icon": "💶",
        "sql": """SELECT code_departement as dept, AVG(loyer_m2_moyen) as val
                  FROM loyers GROUP BY code_departement""",
        "higher_is": "cher",
    },
    {
        "key": "cambriolages",
        "label": "Cambriolages (‰)",
        "icon": "🔒",
        "sql": """SELECT code_departement as dept, taux_pour_mille as val
                  FROM delinquance WHERE annee = 2024 AND indicateur = 'Cambriolages de logement'""",
        "higher_is": "dangereux",
    },
    {
        "key": "violences",
        "label": "Violences physiques (‰)",
        "icon": "⚠️",
        "sql": """SELECT code_departement as dept, taux_pour_mille as val
                  FROM delinquance WHERE annee = 2024 AND indicateur = 'Violences physiques hors cadre familial'""",
        "higher_is": "dangereux",
    },
    {
        "key": "participation",
        "label": "Participation EU 2024 (%)",
        "icon": "🗳️",
        "sql": """SELECT code_geo as dept,
                  votants::numeric / NULLIF(inscrits, 0) * 100 as val
                  FROM elections WHERE scrutin = 'europeennes-2024' AND niveau = 'departement'
                  AND liste = (SELECT liste FROM elections WHERE scrutin='europeennes-2024' AND niveau='departement' LIMIT 1)""",
        "higher_is": "civique",
    },
    {
        "key": "vote_rn",
        "label": "Score RN (%)",
        "icon": "🗳️",
        "sql": """SELECT code_geo as dept, pct_voix_exprimes as val
                  FROM elections WHERE scrutin = 'europeennes-2024' AND niveau = 'departement' AND nuance = 'LRN'""",
        "higher_is": "RN",
    },
    {
        "key": "fibre",
        "label": "Couverture fibre (%)",
        "icon": "📡",
        "sql": """SELECT code_departement as dept, AVG(taux_couverture) as val
                  FROM fibre GROUP BY code_departement""",
        "higher_is": "connecté",
    },
    {
        "key": "accidents",
        "label": "Accidents route (/100K hab)",
        "icon": "🚗",
        "sql": """SELECT a.code_departement as dept,
                  a.nb_accidents::numeric / NULLIF(d.population, 0) * 100000 as val
                  FROM accidents a
                  LEFT JOIN (SELECT DISTINCT ON (code_departement) code_departement, population
                             FROM delinquance WHERE annee = 2024 ORDER BY code_departement) d
                  ON a.code_departement = d.code_departement
                  WHERE a.annee = 2024 AND d.population > 0""",
        "higher_is": "accidentogène",
    },
    {
        "key": "brevet",
        "label": "Réussite brevet (%)",
        "icon": "🎓",
        "sql": """SELECT code_departement as dept, taux_reussite as val
                  FROM brevet WHERE session = (SELECT MAX(session) FROM brevet)""",
        "higher_is": "éduqué",
    },
    {
        "key": "medecins",
        "label": "Accès médecins (APL)",
        "icon": "🏥",
        "sql": """SELECT code_departement as dept, AVG(apl_medecins_generalistes) as val
                  FROM apl_medecins GROUP BY code_departement""",
        "higher_is": "bien soigné",
    },
    {
        "key": "parite_maires",
        "label": "Parité maires (%F)",
        "icon": "🏛️",
        "sql": """SELECT code_departement as dept,
                  100.0 * SUM(CASE WHEN sexe = 'F' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0) as val
                  FROM elus WHERE type_mandat = 'maire' GROUP BY code_departement""",
        "higher_is": "paritaire",
    },
]


def pearson(x_vals, y_vals):
    """Compute Pearson correlation coefficient."""
    n = len(x_vals)
    if n < 5:
        return 0.0
    mean_x = sum(x_vals) / n
    mean_y = sum(y_vals) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, y_vals))
    den_x = math.sqrt(sum((x - mean_x) ** 2 for x in x_vals))
    den_y = math.sqrt(sum((y - mean_y) ** 2 for y in y_vals))
    if den_x == 0 or den_y == 0:
        return 0.0
    return num / (den_x * den_y)


def describe_correlation(ind_x, ind_y, r):
    """Generate a human-readable description of a correlation."""
    strength = "fortement" if abs(r) > 0.7 else "significativement"
    if r > 0:
        return f"Plus un département a un {ind_x['label'].lower()} élevé, plus son {ind_y['label'].lower()} est élevé ({strength} corrélés, r={r:.2f})."
    else:
        return f"Plus un département a un {ind_x['label'].lower()} élevé, plus son {ind_y['label'].lower()} est faible (corrélation inverse, r={r:.2f})."


def title_for_correlation(ind_x, ind_y, r):
    """Generate a catchy title."""
    if r > 0:
        return f"{ind_x['icon']} {ind_x['label'].split('(')[0].strip()} et {ind_y['icon']} {ind_y['label'].split('(')[0].strip()} vont de pair"
    else:
        return f"{ind_x['icon']} {ind_x['label'].split('(')[0].strip()} vs {ind_y['icon']} {ind_y['label'].split('(')[0].strip()}"


@router.get("/correlations", response_model=list[Insight])
async def get_correlations():
    """Compute all pairwise correlations and return the most surprising ones."""
    pool = await get_pool()

    # Fetch all indicator values by department
    data = {}
    for ind in INDICATORS:
        try:
            rows = await pool.fetch(ind["sql"])
            data[ind["key"]] = {str(r["dept"]).zfill(2): float(r["val"]) for r in rows if r["val"] is not None}
        except Exception:
            continue

    # Compute all pairwise correlations
    results = []
    keys = list(data.keys())
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            k1, k2 = keys[i], keys[j]
            # Find common departments
            common = set(data[k1].keys()) & set(data[k2].keys())
            if len(common) < 20:
                continue
            x_vals = [data[k1][d] for d in common]
            y_vals = [data[k2][d] for d in common]
            r = pearson(x_vals, y_vals)
            if abs(r) > 0.3:  # Only interesting correlations
                ind_x = next(ind for ind in INDICATORS if ind["key"] == k1)
                ind_y = next(ind for ind in INDICATORS if ind["key"] == k2)
                results.append(Insight(
                    title=title_for_correlation(ind_x, ind_y, r),
                    description=describe_correlation(ind_x, ind_y, r),
                    correlation=round(r, 3),
                    indicator_x=k1,
                    indicator_y=k2,
                    icon=ind_x["icon"],
                ))

    # Sort by absolute correlation (most surprising first)
    results.sort(key=lambda x: -abs(x.correlation))
    return results[:12]
