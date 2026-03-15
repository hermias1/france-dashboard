from fastapi import APIRouter, Query
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/accidents", tags=["accidents"])


class AccidentsByDept(BaseModel):
    code_departement: str
    nom_departement: str
    nb_accidents: int
    population: int | None = None
    taux_pour_100k: float | None = None


@router.get("/departements", response_model=list[AccidentsByDept])
async def get_accidents_departements(
    annee: int = Query(2024),
):
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT a.code_departement, dep.nom as nom_departement, a.nb_accidents,
                  d.population,
                  CASE WHEN d.population > 0
                    THEN ROUND(a.nb_accidents::numeric / d.population * 100000, 1)
                    ELSE NULL END as taux_pour_100k
           FROM accidents a
           JOIN departements dep ON a.code_departement = dep.code
           LEFT JOIN (
             SELECT DISTINCT ON (code_departement) code_departement, population
             FROM delinquance WHERE annee = 2024 ORDER BY code_departement, annee DESC
           ) d ON a.code_departement = d.code_departement
           WHERE a.annee = $1
           ORDER BY a.nb_accidents DESC""",
        annee,
    )
    return [AccidentsByDept(**dict(r)) for r in rows]
