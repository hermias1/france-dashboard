from fastapi import APIRouter, HTTPException
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/territoire", tags=["territoire"])


class Indicateur(BaseModel):
    label: str
    valeur: str
    detail: str | None = None
    comparaison: str  # "au-dessus", "en-dessous", "dans la moyenne"
    ecart_pct: float  # écart en % par rapport à la moyenne nationale
    icone: str
    score: int = 50  # normalized 0-100 (50=average, 100=best)


class TerritoireProfile(BaseModel):
    code: str
    nom: str
    type: str  # "departement"
    indicateurs: list[Indicateur]
    score_global: int = 50  # average of all indicator scores


@router.get("/search")
async def search_territoire(q: str):
    """Search departments by name or code."""
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT code, nom FROM departements
           WHERE LOWER(nom) LIKE $1 OR code = $2
           ORDER BY nom LIMIT 10""",
        f"%{q.lower()}%", q.strip().zfill(2),
    )
    return [{"code": r["code"], "nom": r["nom"], "type": "departement"} for r in rows]


@router.get("/departement/{code}", response_model=TerritoireProfile)
async def get_departement_profile(code: str):
    pool = await get_pool()

    # Get department info
    dept = await pool.fetchrow(
        "SELECT code, nom FROM departements WHERE code = $1", code
    )
    if not dept:
        raise HTTPException(status_code=404, detail="Département non trouvé")

    indicateurs = []

    # 1. Prix immobilier
    immo = await pool.fetchrow(
        """SELECT ROUND(AVG(prix_m2_moyen)) as val FROM immobilier
           WHERE LEFT(code_commune, 2) = $1 AND prix_m2_moyen > 0 AND annee = 2024""", code)
    immo_nat = await pool.fetchval(
        "SELECT ROUND(AVG(prix_m2_moyen)) FROM immobilier WHERE prix_m2_moyen > 0 AND annee = 2024")
    if immo and immo["val"] and immo_nat:
        ecart = round((immo["val"] - immo_nat) / immo_nat * 100, 1)
        indicateurs.append(Indicateur(
            label="Prix immobilier",
            valeur=f"{int(immo['val']):,} €/m²".replace(",", " "),
            comparaison=_comp(ecart),
            ecart_pct=ecart,
            icone="🏠",
        ))

    # 2. Loyer
    loyer = await pool.fetchrow(
        "SELECT ROUND(AVG(loyer_m2_moyen)::numeric, 1) as val FROM loyers WHERE code_departement = $1", code)
    loyer_nat = await pool.fetchval(
        "SELECT ROUND(AVG(loyer_m2_moyen)::numeric, 1) FROM loyers")
    if loyer and loyer["val"] and loyer_nat:
        ecart = round((float(loyer["val"]) - float(loyer_nat)) / float(loyer_nat) * 100, 1)
        indicateurs.append(Indicateur(
            label="Loyer moyen",
            valeur=f"{loyer['val']} €/m²",
            comparaison=_comp(ecart),
            ecart_pct=ecart,
            icone="💶",
        ))

    # 3. Cambriolages
    cambr = await pool.fetchrow(
        """SELECT taux_pour_mille as val FROM delinquance
           WHERE code_departement = $1 AND annee = 2024
           AND indicateur = 'Cambriolages de logement'""", code)
    cambr_nat = await pool.fetchval(
        """SELECT AVG(taux_pour_mille) FROM delinquance
           WHERE annee = 2024 AND indicateur = 'Cambriolages de logement'""")
    if cambr and cambr["val"] is not None and cambr_nat:
        ecart = round((cambr["val"] - cambr_nat) / cambr_nat * 100, 1)
        indicateurs.append(Indicateur(
            label="Cambriolages",
            valeur=f"{cambr['val']:.1f} ‰",
            comparaison=_comp(ecart, inverse=True),
            ecart_pct=ecart,
            icone="🔒",
        ))

    # 4. Participation électorale EU 2024
    parti = await pool.fetchrow(
        """SELECT ROUND(votants::numeric / NULLIF(inscrits, 0) * 100, 1) as val
           FROM elections WHERE scrutin = 'europeennes-2024' AND niveau = 'departement'
           AND code_geo = $1 LIMIT 1""", code)
    parti_nat = await pool.fetchval(
        """SELECT ROUND(SUM(votants)::numeric / NULLIF(SUM(inscrits), 0) * 100, 1)
           FROM elections WHERE scrutin = 'europeennes-2024' AND niveau = 'departement'""")
    if parti and parti["val"] and parti_nat:
        ecart = round((float(parti["val"]) - float(parti_nat)) / float(parti_nat) * 100, 1)
        indicateurs.append(Indicateur(
            label="Participation EU 2024",
            valeur=f"{parti['val']}%",
            comparaison=_comp(ecart),
            ecart_pct=ecart,
            icone="🗳️",
        ))

    # 5. Fibre
    fibre = await pool.fetchrow(
        """SELECT ROUND(AVG(taux_couverture)::numeric, 1) as val
           FROM fibre WHERE code_departement = $1""", code)
    fibre_nat = await pool.fetchval(
        "SELECT ROUND(AVG(taux_couverture)::numeric, 1) FROM fibre")
    if fibre and fibre["val"] and fibre_nat:
        ecart = round((float(fibre["val"]) - float(fibre_nat)) / float(fibre_nat) * 100, 1)
        indicateurs.append(Indicateur(
            label="Couverture fibre",
            valeur=f"{fibre['val']}%",
            comparaison=_comp(ecart),
            ecart_pct=ecart,
            icone="📡",
        ))

    # 6. Accidents (per 100K inhabitants using population from delinquance)
    acc = await pool.fetchrow(
        """SELECT a.nb_accidents, d.population,
                  CASE WHEN d.population > 0
                    THEN ROUND(a.nb_accidents::numeric / d.population * 100000, 1)
                    ELSE NULL END as taux
           FROM accidents a
           LEFT JOIN (SELECT DISTINCT ON (code_departement) code_departement, population
                      FROM delinquance WHERE annee = 2024 ORDER BY code_departement) d
           ON a.code_departement = d.code_departement
           WHERE a.code_departement = $1 AND a.annee = 2024""", code)
    acc_nat = await pool.fetchval(
        """SELECT ROUND(AVG(sub.taux)::numeric, 1) FROM (
             SELECT a.nb_accidents::numeric / NULLIF(d.population, 0) * 100000 as taux
             FROM accidents a
             LEFT JOIN (SELECT DISTINCT ON (code_departement) code_departement, population
                        FROM delinquance WHERE annee = 2024 ORDER BY code_departement) d
             ON a.code_departement = d.code_departement
             WHERE a.annee = 2024 AND d.population > 0
           ) sub""")
    if acc and acc["taux"] and acc_nat:
        ecart = round((float(acc["taux"]) - float(acc_nat)) / float(acc_nat) * 100, 1)
        indicateurs.append(Indicateur(
            label="Accidents route",
            valeur=f"{acc['taux']} /100K hab.",
            comparaison=_comp(ecart, inverse=True),
            ecart_pct=ecart,
            icone="🚗",
        ))

    # 7. Brevet
    brev = await pool.fetchrow(
        """SELECT taux_reussite as val FROM brevet
           WHERE code_departement = $1 ORDER BY session DESC LIMIT 1""", code)
    brev_nat = await pool.fetchval(
        "SELECT AVG(taux_reussite) FROM brevet WHERE session = (SELECT MAX(session) FROM brevet)")
    if brev and brev["val"] and brev_nat:
        ecart = round((brev["val"] - brev_nat) / brev_nat * 100, 1)
        indicateurs.append(Indicateur(
            label="Réussite brevet",
            valeur=f"{brev['val']:.1f}%",
            comparaison=_comp(ecart),
            ecart_pct=ecart,
            icone="🎓",
        ))

    # 8. Revenu médian
    rev = await pool.fetchrow(
        "SELECT revenu_median as val FROM precarite WHERE code_departement = $1", code)
    rev_nat = await pool.fetchval("SELECT AVG(revenu_median) FROM precarite WHERE revenu_median IS NOT NULL")
    if rev and rev["val"] and rev_nat:
        ecart = round((rev["val"] - rev_nat) / rev_nat * 100, 1)
        indicateurs.append(Indicateur(
            label="Revenu médian",
            valeur=f"{rev['val']:,} €/an".replace(",", " "),
            comparaison=_comp(ecart),
            ecart_pct=ecart,
            icone="💰",
        ))

    # 9. Taux de pauvreté
    pauv = await pool.fetchrow(
        "SELECT taux_pauvrete as val FROM precarite WHERE code_departement = $1", code)
    pauv_nat = await pool.fetchval("SELECT AVG(taux_pauvrete) FROM precarite WHERE taux_pauvrete IS NOT NULL")
    if pauv and pauv["val"] and pauv_nat:
        ecart = round((pauv["val"] - pauv_nat) / pauv_nat * 100, 1)
        indicateurs.append(Indicateur(
            label="Taux de pauvreté",
            valeur=f"{pauv['val']:.0f}%",
            comparaison=_comp(ecart, inverse=True),
            ecart_pct=ecart,
            icone="📉",
        ))

    # Compute scores using soft sigmoid (0-100, 50=average)
    import math
    for ind in indicateurs:
        inverse = ind.label in ("Cambriolages", "Accidents route", "Taux de pauvreté")
        try:
            ecart = ind.ecart_pct
            if inverse:
                ecart = -ecart
            # Sigmoid with scale 80: ±80% → ~27/73, ±160% → ~12/88
            # This spreads scores more evenly across the 0-100 range
            normalized = 1 / (1 + math.exp(-ecart / 80))
            ind.score = max(5, min(95, int(normalized * 100)))
        except Exception:
            ind.score = 50

    score_global = int(sum(i.score for i in indicateurs) / len(indicateurs)) if indicateurs else 50

    return TerritoireProfile(
        code=dept["code"],
        nom=dept["nom"],
        type="departement",
        indicateurs=indicateurs,
        score_global=score_global,
    )


def _comp(ecart: float, inverse: bool = False) -> str:
    """Determine comparison label. inverse=True means lower is better."""
    if inverse:
        ecart = -ecart
    if ecart > 5:
        return "au-dessus"
    elif ecart < -5:
        return "en-dessous"
    return "dans la moyenne"
