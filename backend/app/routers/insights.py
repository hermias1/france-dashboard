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
                  FROM (SELECT DISTINCT ON (code_geo) code_geo, inscrits, votants
                        FROM elections WHERE scrutin = 'europeennes-2024' AND niveau = 'departement'
                        ORDER BY code_geo) sub""",
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
    # === PRÉCARITÉ ===
    {
        "key": "revenu_median",
        "label": "Revenu médian (€)",
        "icon": "💰",
        "sql": "SELECT code_departement as dept, revenu_median as val FROM precarite WHERE revenu_median > 0",
        "higher_is": "riche",
    },
    {
        "key": "taux_pauvrete",
        "label": "Taux de pauvreté (%)",
        "icon": "📉",
        "sql": "SELECT code_departement as dept, taux_pauvrete as val FROM precarite WHERE taux_pauvrete > 0",
        "higher_is": "précaire",
    },
    {
        "key": "taux_chomage_jeunes",
        "label": "Chômage jeunes (%)",
        "icon": "👤",
        "sql": "SELECT code_departement as dept, taux_chomage_jeunes as val FROM precarite WHERE taux_chomage_jeunes > 0",
        "higher_is": "au chômage",
    },
    {
        "key": "ecart_salarial",
        "label": "Écart salarial H/F (€)",
        "icon": "⚖️",
        "sql": "SELECT code_departement as dept, salaire_hommes - salaire_femmes as val FROM precarite WHERE salaire_hommes > 0 AND salaire_femmes > 0",
        "higher_is": "inégal",
    },
    # === DERIVED INDICATORS (computed from existing data) ===
    {
        "key": "tendance_cambriolages",
        "label": "Évolution cambriolages 2016→2024 (%)",
        "icon": "📉",
        "sql": """SELECT d24.code_departement as dept,
                  ROUND(((d24.nombre - d16.nombre)::numeric / NULLIF(d16.nombre, 0)) * 100, 1) as val
                  FROM delinquance d24
                  JOIN delinquance d16 ON d24.code_departement = d16.code_departement
                    AND d16.annee = 2016 AND d16.indicateur = 'Cambriolages de logement'
                  WHERE d24.annee = 2024 AND d24.indicateur = 'Cambriolages de logement'
                    AND d16.nombre > 0""",
        "higher_is": "en hausse",
    },
    {
        "key": "densite_pop",
        "label": "Densité population (hab/km²)",
        "icon": "🏙️",
        "sql": """SELECT code_departement as dept,
                  population::numeric / NULLIF(
                    (SELECT COUNT(DISTINCT code_commune) FROM fibre f WHERE f.code_departement = d.code_departement), 0
                  ) as val
                  FROM (SELECT DISTINCT ON (code_departement) code_departement, population
                        FROM delinquance WHERE annee = 2024 AND population > 0
                        ORDER BY code_departement) d""",
        "higher_is": "dense",
    },
    {
        "key": "age_maires",
        "label": "Âge moyen maires (ans)",
        "icon": "👴",
        "sql": """SELECT code_departement as dept,
                  AVG(EXTRACT(YEAR FROM AGE(date_naissance))) as val
                  FROM elus WHERE type_mandat = 'maire' AND date_naissance IS NOT NULL
                  GROUP BY code_departement
                  HAVING COUNT(*) >= 10""",
        "higher_is": "âgé",
    },
    {
        "key": "ratio_loyer_achat",
        "label": "Ratio loyer/achat (années)",
        "icon": "🏠",
        "sql": """SELECT l.code_departement as dept,
                  AVG(i.prix_m2_moyen)::numeric / NULLIF(AVG(l.loyer_m2_moyen) * 12, 0) as val
                  FROM loyers l
                  JOIN immobilier i ON LEFT(i.code_commune, 2) = l.code_departement AND i.annee = 2024
                  WHERE l.loyer_m2_moyen > 0 AND i.prix_m2_moyen > 0
                  GROUP BY l.code_departement""",
        "higher_is": "long à rentabiliser",
    },
    {
        "key": "tendance_violences",
        "label": "Évolution violences 2016→2024 (%)",
        "icon": "📈",
        "sql": """SELECT d24.code_departement as dept,
                  ROUND(((d24.nombre - d16.nombre)::numeric / NULLIF(d16.nombre, 0)) * 100, 1) as val
                  FROM delinquance d24
                  JOIN delinquance d16 ON d24.code_departement = d16.code_departement
                    AND d16.annee = 2016 AND d16.indicateur = 'Violences physiques hors cadre familial'
                  WHERE d24.annee = 2024 AND d24.indicateur = 'Violences physiques hors cadre familial'
                    AND d16.nombre > 0""",
        "higher_is": "en hausse",
    },
    {
        "key": "prix_evolution",
        "label": "Évolution prix immo 2018→2024 (%)",
        "icon": "📈",
        "sql": """SELECT i24.dept, ROUND(((i24.prix - i18.prix)::numeric / NULLIF(i18.prix, 0)) * 100, 1) as val
                  FROM (SELECT LEFT(code_commune, 2) as dept, AVG(prix_m2_moyen) as prix FROM immobilier WHERE annee = 2024 AND prix_m2_moyen > 0 GROUP BY LEFT(code_commune, 2)) i24
                  JOIN (SELECT LEFT(code_commune, 2) as dept, AVG(prix_m2_moyen) as prix FROM immobilier WHERE annee = 2018 AND prix_m2_moyen > 0 GROUP BY LEFT(code_commune, 2)) i18
                  ON i24.dept = i18.dept
                  WHERE i18.prix > 0""",
        "higher_is": "en hausse",
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


LABEL_PHRASES = {
    "prix_immo": ("le prix immobilier", "un prix immobilier"),
    "loyer": ("le loyer", "un loyer"),
    "cambriolages": ("le taux de cambriolages", "un taux de cambriolages"),
    "violences": ("le taux de violences", "un taux de violences"),
    "participation": ("la participation électorale", "une participation"),
    "vote_rn": ("le score du RN", "un score RN"),
    "fibre": ("la couverture fibre", "une couverture fibre"),
    "accidents": ("le taux d'accidents", "un taux d'accidents"),
    "brevet": ("le taux de réussite au brevet", "un taux de réussite"),
    "medecins": ("l'accès aux médecins", "un accès aux médecins"),
    "parite_maires": ("la parité des maires", "une parité"),
    "tendance_cambriolages": ("la hausse des cambriolages", "une hausse des cambriolages"),
    "densite_pop": ("la densité de population", "une densité"),
    "age_maires": ("l'âge moyen des maires", "un âge moyen des maires"),
    "ratio_loyer_achat": ("le ratio loyer/achat", "un ratio loyer/achat"),
    "tendance_violences": ("la hausse des violences", "une hausse des violences"),
    "prix_evolution": ("la hausse des prix immobiliers", "une hausse des prix"),
    "revenu_median": ("le revenu médian", "un revenu médian"),
    "taux_pauvrete": ("le taux de pauvreté", "un taux de pauvreté"),
    "taux_chomage_jeunes": ("le chômage des jeunes", "un chômage des jeunes"),
    "ecart_salarial": ("l'écart salarial H/F", "un écart salarial"),
}


def describe_correlation(ind_x, ind_y, r):
    """Generate a human-readable description of a correlation."""
    px = LABEL_PHRASES.get(ind_x['key'], (f"le {ind_x['label'].lower()}", f"un {ind_x['label'].lower()}"))
    py = LABEL_PHRASES.get(ind_y['key'], (f"le {ind_y['label'].lower()}", f"un {ind_y['label'].lower()}"))
    strength = "forte" if abs(r) > 0.7 else "significative"
    if r > 0:
        return f"Les départements où {px[0]} est le plus fort ont aussi {py[1]} plus élevé. Corrélation {strength} (r={r:.2f})."
    else:
        return f"Les départements où {px[0]} est le plus fort ont {py[1]} plus faible. Corrélation inverse {strength} (r={r:.2f})."


def title_for_correlation(ind_x, ind_y, r):
    """Generate a catchy title."""
    if r > 0:
        return f"{ind_x['icon']} {ind_x['label'].split('(')[0].strip()} et {ind_y['icon']} {ind_y['label'].split('(')[0].strip()} vont de pair"
    else:
        return f"{ind_x['icon']} {ind_x['label'].split('(')[0].strip()} vs {ind_y['icon']} {ind_y['label'].split('(')[0].strip()}"


import time as _time
_cache: dict = {"data": None, "ts": 0}
CACHE_TTL = 3600  # 1 hour


@router.get("/correlations", response_model=list[Insight])
async def get_correlations():
    """Compute all pairwise correlations and return the most surprising ones. Cached for 1h."""
    if _cache["data"] and (_time.time() - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]

    pool = await get_pool()

    # Fetch all indicator values by department
    data = {}
    for ind in INDICATORS:
        try:
            rows = await pool.fetch(ind["sql"])
            data[ind["key"]] = {str(r["dept"]).zfill(2): float(r["val"]) for r in rows if r["val"] is not None}
        except Exception:
            continue

    # Thematic families — correlations within same family are trivial
    FAMILIES = {
        "immobilier": {"prix_immo", "loyer", "ratio_loyer_achat", "prix_evolution"},
        "securite": {"cambriolages", "violences", "tendance_cambriolages", "tendance_violences"},
        "vote": {"participation", "vote_rn"},
        "demo": {"densite_pop", "age_maires"},
        "precarite": {"revenu_median", "taux_pauvrete", "taux_chomage_jeunes", "ecart_salarial"},
    }

    def same_family(k1, k2):
        for family in FAMILIES.values():
            if k1 in family and k2 in family:
                return True
        return False

    # Compute all pairwise correlations
    results = []
    keys = list(data.keys())
    for i in range(len(keys)):
        for j in range(i + 1, len(keys)):
            k1, k2 = keys[i], keys[j]
            # Skip same-family pairs (trivial)
            if same_family(k1, k2):
                continue
            # Find common departments
            common = set(data[k1].keys()) & set(data[k2].keys())
            if len(common) < 20:
                continue
            x_vals = [data[k1][d] for d in common]
            y_vals = [data[k2][d] for d in common]
            r = pearson(x_vals, y_vals)
            if abs(r) > 0.35:
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
    output = results[:12]
    _cache["data"] = output
    _cache["ts"] = _time.time()
    return output
