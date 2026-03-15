from fastapi import APIRouter, Query
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/education", tags=["education"])


class BrevetByDept(BaseModel):
    code_departement: str
    nom_departement: str
    taux_reussite: float
    inscrits: int
    admis: int


@router.get("/brevet", response_model=list[BrevetByDept])
async def get_brevet(
    session: int = Query(None),
):
    pool = await get_pool()
    if session is None:
        session = await pool.fetchval("SELECT MAX(session) FROM brevet")
    rows = await pool.fetch(
        """SELECT b.code_departement, dep.nom as nom_departement,
                  b.taux_reussite, b.inscrits, b.admis
           FROM brevet b
           JOIN departements dep ON b.code_departement = dep.code
           WHERE b.session = $1
           ORDER BY b.taux_reussite DESC""",
        session,
    )
    return [BrevetByDept(**dict(r)) for r in rows]
