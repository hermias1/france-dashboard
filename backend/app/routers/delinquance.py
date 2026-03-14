from fastapi import APIRouter, Query
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/delinquance", tags=["delinquance"])


class DelinquanceByDept(BaseModel):
    code_departement: str
    nom_departement: str
    indicateur: str
    nombre: int
    taux_pour_mille: float
    population: int


class DelinquanceEvolution(BaseModel):
    annee: int
    indicateur: str
    total: int


@router.get("/departements", response_model=list[DelinquanceByDept])
async def get_delinquance_departements(
    annee: int = Query(2024),
    indicateur: str = Query(None),
):
    pool = await get_pool()
    query = """
        SELECT d.code_departement, dep.nom as nom_departement,
               d.indicateur, d.nombre, d.taux_pour_mille, d.population
        FROM delinquance d
        JOIN departements dep ON d.code_departement = dep.code
        WHERE d.annee = $1
    """
    params = [annee]
    if indicateur:
        query += f" AND d.indicateur = ${len(params)+1}"
        params.append(indicateur)
    query += " ORDER BY d.taux_pour_mille DESC LIMIT 50"
    rows = await pool.fetch(query, *params)
    return [DelinquanceByDept(**dict(r)) for r in rows]


@router.get("/evolution", response_model=list[DelinquanceEvolution])
async def get_delinquance_evolution(
    indicateur: str = Query("Coups et blessures volontaires"),
):
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT annee, indicateur, SUM(nombre) as total
           FROM delinquance
           WHERE indicateur = $1
           GROUP BY annee, indicateur
           ORDER BY annee""",
        indicateur,
    )
    return [DelinquanceEvolution(**dict(r)) for r in rows]


@router.get("/indicateurs")
async def get_indicateurs():
    pool = await get_pool()
    rows = await pool.fetch("SELECT DISTINCT indicateur FROM delinquance ORDER BY indicateur")
    return [r["indicateur"] for r in rows]
