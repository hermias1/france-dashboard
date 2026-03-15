from fastapi import APIRouter, Query
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/accidents", tags=["accidents"])


class AccidentsByDept(BaseModel):
    code_departement: str
    nom_departement: str
    nb_accidents: int


@router.get("/departements", response_model=list[AccidentsByDept])
async def get_accidents_departements(
    annee: int = Query(2024),
):
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT a.code_departement, dep.nom as nom_departement, a.nb_accidents
           FROM accidents a
           JOIN departements dep ON a.code_departement = dep.code
           WHERE a.annee = $1
           ORDER BY a.nb_accidents DESC""",
        annee,
    )
    return [AccidentsByDept(**dict(r)) for r in rows]
