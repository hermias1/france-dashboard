from fastapi import APIRouter
from app.db import get_pool
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/precarite", tags=["precarite"])


class PrecariteDept(BaseModel):
    code_departement: str
    nom_departement: Optional[str]
    revenu_median: Optional[int]
    taux_pauvrete: Optional[float]
    taux_rsa: Optional[float]
    taux_chomage_jeunes: Optional[float]
    salaire_femmes: Optional[int]
    salaire_hommes: Optional[int]


@router.get("/departements", response_model=list[PrecariteDept])
async def get_precarite_departements():
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT code_departement, nom_departement, revenu_median, taux_pauvrete,
                  taux_rsa, taux_chomage_jeunes, salaire_femmes, salaire_hommes
           FROM precarite
           ORDER BY revenu_median DESC"""
    )
    return [PrecariteDept(**dict(r)) for r in rows]
