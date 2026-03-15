from fastapi import APIRouter
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/sante", tags=["sante"])


class AplByDept(BaseModel):
    code_departement: str
    nom_departement: str
    apl_moyen: float
    nb_communes: int
    population: int


@router.get("/medecins", response_model=list[AplByDept])
async def get_medecins_departements():
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT a.code_departement, d.nom as nom_departement,
               ROUND(AVG(a.apl_medecins_generalistes)::numeric, 1) as apl_moyen,
               COUNT(*) as nb_communes,
               SUM(a.population) as population
        FROM apl_medecins a
        JOIN departements d ON a.code_departement = d.code
        GROUP BY a.code_departement, d.nom
        ORDER BY apl_moyen ASC
    """)
    return [AplByDept(**dict(r)) for r in rows]
