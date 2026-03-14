from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import get_pool, close_pool
from app.routers import elections, energie, geo, question, delinquance, immobilier


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    yield
    await close_pool()


app = FastAPI(title="État de la France", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(elections.router)
app.include_router(energie.router)
app.include_router(geo.router)
app.include_router(question.router)
app.include_router(delinquance.router)
app.include_router(immobilier.router)


@app.get("/api/health")
async def health():
    pool = await get_pool()
    row = await pool.fetchval("SELECT 1")
    return {"status": "ok", "db": row == 1}
