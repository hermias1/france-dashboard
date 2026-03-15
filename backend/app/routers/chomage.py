from fastapi import APIRouter, Query
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/chomage", tags=["chomage"])


class ChomageByDept(BaseModel):
    code_departement: str
    nom_departement: str
    nombre: int


class ChomageEvolution(BaseModel):
    date: str
    nombre: int


@router.get("/departements", response_model=list[ChomageByDept])
async def get_chomage_departements(
    date: str = Query("2024-12"),
):
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT c.code_departement, COALESCE(d.nom, c.nom_departement) as nom_departement, c.nombre
           FROM chomage c
           LEFT JOIN departements d ON c.code_departement = d.code
           WHERE c.date = $1
           ORDER BY c.nombre DESC""",
        date,
    )
    return [ChomageByDept(**dict(r)) for r in rows]


@router.get("/evolution", response_model=list[ChomageEvolution])
async def get_chomage_evolution(
    code_departement: str = Query("75"),
):
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT date, nombre
           FROM chomage
           WHERE code_departement = $1
           ORDER BY date""",
        code_departement,
    )
    return [ChomageEvolution(**dict(r)) for r in rows]
