from fastapi import APIRouter
from app.db import get_pool
from app.models import GeoRegion, GeoDepartement

router = APIRouter(prefix="/api/geo", tags=["geo"])


@router.get("/regions", response_model=list[GeoRegion])
async def get_regions():
    pool = await get_pool()
    rows = await pool.fetch("SELECT code, nom FROM regions ORDER BY nom")
    return [GeoRegion(**dict(r)) for r in rows]


@router.get("/departements", response_model=list[GeoDepartement])
async def get_departements():
    pool = await get_pool()
    rows = await pool.fetch("SELECT code, nom, region_code FROM departements ORDER BY nom")
    return [GeoDepartement(**dict(r)) for r in rows]
