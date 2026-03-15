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

    # 6. Accidents
    acc = await pool.fetchrow(
        "SELECT nb_accidents as val FROM accidents WHERE code_departement = $1 AND annee = 2024", code)
    acc_nat = await pool.fetchval(
        "SELECT AVG(nb_accidents) FROM accidents WHERE annee = 2024")
    if acc and acc["val"] and acc_nat:
        ecart = round((acc["val"] - acc_nat) / acc_nat * 100, 1)
        indicateurs.append(Indicateur(
            label="Accidents route",
            valeur=f"{acc['val']:,}".replace(",", " "),
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

    # Compute normalized scores (0-100, 50=average)
    for ind in indicateurs:
        inverse = ind.label in ("Cambriolages", "Accidents route")
        ecart = ind.ecart_pct
        if inverse:
            ecart = -ecart
        # Map ecart to 0-100: -100% → 0, 0% → 50, +100% → 100
        ind.score = max(0, min(100, int(50 + ecart * 0.5)))

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
