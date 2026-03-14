from fastapi import APIRouter, Query
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/immobilier", tags=["immobilier"])


class ImmobilierByDept(BaseModel):
    code_departement: str
    nom_departement: str
    prix_m2_moyen: float
    nb_mutations: int


class ImmobilierEvolution(BaseModel):
    annee: int
    prix_m2_moyen: float
    nb_mutations: int


@router.get("/departements", response_model=list[ImmobilierByDept])
async def get_immobilier_departements(
    annee: int = Query(2024),
):
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT LEFT(i.code_commune, 2) as code_departement,
                  d.nom as nom_departement,
                  ROUND(AVG(i.prix_m2_moyen)) as prix_m2_moyen,
                  SUM(i.nb_mutations) as nb_mutations
           FROM immobilier i
           JOIN departements d ON LEFT(i.code_commune, 2) = d.code
           WHERE i.annee = $1 AND i.prix_m2_moyen > 0
           GROUP BY LEFT(i.code_commune, 2), d.nom
           ORDER BY prix_m2_moyen DESC""",
        annee,
    )
    return [ImmobilierByDept(**dict(r)) for r in rows]


@router.get("/evolution", response_model=list[ImmobilierEvolution])
async def get_immobilier_evolution():
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT annee,
                  ROUND(AVG(prix_m2_moyen)) as prix_m2_moyen,
                  SUM(nb_mutations) as nb_mutations
           FROM immobilier
           WHERE prix_m2_moyen > 0
           GROUP BY annee
           ORDER BY annee"""
    )
    return [ImmobilierEvolution(**dict(r)) for r in rows]
