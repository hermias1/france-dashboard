from fastapi import APIRouter
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/politique", tags=["politique"])


class MandatStats(BaseModel):
    total: int
    hommes: int
    femmes: int
    age_moyen: float


class PolitiqueStats(BaseModel):
    deputes: MandatStats
    senateurs: MandatStats
    maires: MandatStats


class Elu(BaseModel):
    nom: str
    prenom: str
    sexe: str | None
    code_departement: str | None
    profession: str | None
    date_naissance: str | None
    date_debut_mandat: str | None
    circonscription: str | None


class PariteDepartement(BaseModel):
    code_departement: str
    nom_departement: str
    pct_femmes_maires: float


@router.get("/stats", response_model=PolitiqueStats)
async def get_stats():
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT type_mandat,
               COUNT(*) as total,
               COUNT(*) FILTER (WHERE sexe = 'M') as hommes,
               COUNT(*) FILTER (WHERE sexe = 'F') as femmes,
               ROUND(AVG(EXTRACT(YEAR FROM AGE(date_naissance)))::numeric, 1) as age_moyen
        FROM elus
        WHERE type_mandat IN ('depute', 'senateur', 'maire')
        GROUP BY type_mandat
    """)
    result = {}
    for r in rows:
        result[r["type_mandat"] + "s" if r["type_mandat"] != "maire" else "maires"] = MandatStats(
            total=r["total"],
            hommes=r["hommes"],
            femmes=r["femmes"],
            age_moyen=float(r["age_moyen"] or 0),
        )
    # Normalize keys
    mapping = {"deputes": "depute", "senateurs": "senateur", "maires": "maire"}
    stats = {}
    for key, tm in mapping.items():
        row = next((r for r in rows if r["type_mandat"] == tm), None)
        if row:
            stats[key] = MandatStats(
                total=row["total"],
                hommes=row["hommes"],
                femmes=row["femmes"],
                age_moyen=float(row["age_moyen"] or 0),
            )
        else:
            stats[key] = MandatStats(total=0, hommes=0, femmes=0, age_moyen=0)
    return PolitiqueStats(**stats)


@router.get("/deputes", response_model=list[Elu])
async def get_deputes():
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT nom, prenom, sexe, code_departement, profession,
               date_naissance::text, date_debut_mandat::text, circonscription
        FROM elus
        WHERE type_mandat = 'depute'
        ORDER BY nom, prenom
    """)
    return [Elu(**dict(r)) for r in rows]


@router.get("/parite-departement", response_model=list[PariteDepartement])
async def get_parite_departement():
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT e.code_departement,
               d.nom as nom_departement,
               ROUND(100.0 * COUNT(*) FILTER (WHERE e.sexe = 'F') / NULLIF(COUNT(*), 0), 1) as pct_femmes_maires
        FROM elus e
        JOIN departements d ON e.code_departement = d.code
        WHERE e.type_mandat = 'maire'
        GROUP BY e.code_departement, d.nom
        ORDER BY pct_femmes_maires DESC
    """)
    return [PariteDepartement(**dict(r)) for r in rows]
