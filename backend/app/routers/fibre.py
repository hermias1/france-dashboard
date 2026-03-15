from fastapi import APIRouter
from app.db import get_pool
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/fibre", tags=["fibre"])


class FibreByDept(BaseModel):
    code_departement: str
    nom_departement: str
    taux_couverture_moyen: float
    nb_communes: int


@router.get("/departements", response_model=list[FibreByDept])
async def get_fibre_departements():
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT f.code_departement, dep.nom as nom_departement,
                  ROUND(AVG(f.taux_couverture)::numeric, 2) as taux_couverture_moyen,
                  COUNT(*)::int as nb_communes
           FROM fibre f
           JOIN departements dep ON f.code_departement = dep.code
           GROUP BY f.code_departement, dep.nom
           ORDER BY taux_couverture_moyen DESC""",
    )
    return [FibreByDept(**dict(r)) for r in rows]
