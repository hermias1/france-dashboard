from fastapi import APIRouter
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/loyers", tags=["loyers"])


class LoyersByDept(BaseModel):
    code_departement: str
    nom_departement: str
    loyer_m2_moyen: float


@router.get("/departements", response_model=list[LoyersByDept])
async def get_loyers_departements():
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT l.code_departement, dep.nom as nom_departement,
                  ROUND(AVG(l.loyer_m2_moyen)::numeric, 2) as loyer_m2_moyen
           FROM loyers l
           JOIN departements dep ON l.code_departement = dep.code
           GROUP BY l.code_departement, dep.nom
           ORDER BY loyer_m2_moyen DESC""",
    )
    return [LoyersByDept(**dict(r)) for r in rows]
