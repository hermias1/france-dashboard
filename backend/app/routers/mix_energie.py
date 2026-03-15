from fastapi import APIRouter, Query
from app.db import get_pool
from pydantic import BaseModel

router = APIRouter(prefix="/api/energie", tags=["energie"])


class MixJour(BaseModel):
    date: str
    consommation_mw: int
    nucleaire_mw: int
    eolien_mw: int
    solaire_mw: int
    hydraulique_mw: int
    gaz_mw: int
    bioenergies_mw: int
    taux_co2: float | None = None


@router.get("/mix", response_model=list[MixJour])
async def get_mix_energetique(
    date_min: str = Query(None),
    date_max: str = Query(None),
):
    from datetime import date as Date
    pool = await get_pool()
    query = """SELECT date, consommation_mw, nucleaire_mw, eolien_mw, solaire_mw,
                      hydraulique_mw, gaz_mw, bioenergies_mw, taux_co2
               FROM mix_energetique"""
    conditions = []
    params = []
    if date_min:
        conditions.append(f"date >= ${len(params)+1}")
        params.append(Date.fromisoformat(date_min))
    if date_max:
        conditions.append(f"date <= ${len(params)+1}")
        params.append(Date.fromisoformat(date_max))
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY date"
    rows = await pool.fetch(query, *params)
    return [MixJour(date=str(r["date"]), **{k: r[k] for k in r.keys() if k != "date"}) for r in rows]


class MixMoyen(BaseModel):
    nucleaire_pct: float
    eolien_pct: float
    solaire_pct: float
    hydraulique_pct: float
    gaz_pct: float
    bioenergies_pct: float


@router.get("/mix/moyenne", response_model=MixMoyen)
async def get_mix_moyenne():
    pool = await get_pool()
    # Calculate as % of TOTAL PRODUCTION (not consumption) so it sums to ~100%
    row = await pool.fetchrow("""
        WITH totals AS (
            SELECT AVG(nucleaire_mw + eolien_mw + solaire_mw + hydraulique_mw + gaz_mw + bioenergies_mw) as production
            FROM mix_energetique
            WHERE nucleaire_mw > 0
        )
        SELECT
            ROUND(AVG(nucleaire_mw)::numeric / NULLIF((SELECT production FROM totals), 0) * 100, 1) as nucleaire_pct,
            ROUND(AVG(eolien_mw)::numeric / NULLIF((SELECT production FROM totals), 0) * 100, 1) as eolien_pct,
            ROUND(AVG(solaire_mw)::numeric / NULLIF((SELECT production FROM totals), 0) * 100, 1) as solaire_pct,
            ROUND(AVG(hydraulique_mw)::numeric / NULLIF((SELECT production FROM totals), 0) * 100, 1) as hydraulique_pct,
            ROUND(AVG(gaz_mw)::numeric / NULLIF((SELECT production FROM totals), 0) * 100, 1) as gaz_pct,
            ROUND(AVG(bioenergies_mw)::numeric / NULLIF((SELECT production FROM totals), 0) * 100, 1) as bioenergies_pct
        FROM mix_energetique
        WHERE nucleaire_mw > 0
    """)
    return MixMoyen(**dict(row))
