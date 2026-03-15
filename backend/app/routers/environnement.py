from fastapi import APIRouter
from app.db import get_pool
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/environnement", tags=["environnement"])


class DesinfoClimat(BaseModel):
    media: str
    is_public: bool
    is_info_continu: bool
    is_radio: bool
    couverture_climat: Optional[float] = None
    cas_desinfo: Optional[int] = None
    desinfo_par_heure: Optional[float] = None


@router.get("/desinfo-climat", response_model=list[DesinfoClimat])
async def get_desinfo_climat():
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT media, is_public, is_info_continu, is_radio,
                  couverture_climat, cas_desinfo, desinfo_par_heure
           FROM desinfo_climat
           ORDER BY cas_desinfo DESC NULLS LAST"""
    )
    import math
    results = []
    for r in rows:
        d = dict(r)
        # Replace NaN with None for JSON serialization
        for k, v in d.items():
            if isinstance(v, float) and math.isnan(v):
                d[k] = None
        results.append(DesinfoClimat(**d))
    return results
