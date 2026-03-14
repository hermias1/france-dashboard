from fastapi import APIRouter, Query
from app.db import get_pool
from app.models import EnergiePoint

router = APIRouter(prefix="/api/energie", tags=["energie"])


@router.get("/consommation", response_model=list[EnergiePoint])
async def get_consommation(
    date_min: str = Query(None),
    date_max: str = Query(None),
):
    pool = await get_pool()
    query = "SELECT date, pic_consommation_mw, temperature_moyenne, temperature_reference FROM energie"
    conditions = []
    params = []
    if date_min:
        conditions.append(f"date >= ${len(params)+1}")
        params.append(date_min)
    if date_max:
        conditions.append(f"date <= ${len(params)+1}")
        params.append(date_max)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY date"
    rows = await pool.fetch(query, *params)
    return [
        EnergiePoint(
            date=str(r["date"]),
            pic_consommation_mw=r["pic_consommation_mw"],
            temperature_moyenne=r["temperature_moyenne"],
            temperature_reference=r["temperature_reference"],
        )
        for r in rows
    ]
