from fastapi import APIRouter, Query
from app.db import get_pool
from app.models import ElectionResult, ParticipationResult

router = APIRouter(prefix="/api/elections", tags=["elections"])


@router.get("/resultats", response_model=list[ElectionResult])
async def get_resultats(
    scrutin: str = Query(...),
    niveau: str = Query(..., pattern="^(region|departement)$"),
):
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT code_geo, libelle_geo, liste, nuance, voix,
                  pct_voix_exprimes, sieges
           FROM elections
           WHERE scrutin = $1 AND niveau = $2
           ORDER BY voix DESC""",
        scrutin, niveau,
    )
    return [ElectionResult(**dict(r)) for r in rows]


@router.get("/participation", response_model=list[ParticipationResult])
async def get_participation(
    scrutin: str = Query(...),
    niveau: str = Query(..., pattern="^(region|departement)$"),
):
    pool = await get_pool()
    rows = await pool.fetch(
        """SELECT DISTINCT ON (code_geo)
                  code_geo, libelle_geo, inscrits, votants,
                  exprimes, blancs, nuls,
                  ROUND(votants::numeric / NULLIF(inscrits, 0) * 100, 2) as taux_participation
           FROM elections
           WHERE scrutin = $1 AND niveau = $2
           ORDER BY code_geo""",
        scrutin, niveau,
    )
    return [ParticipationResult(**dict(r)) for r in rows]
