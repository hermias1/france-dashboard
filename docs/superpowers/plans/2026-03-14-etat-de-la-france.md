# État de la France — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dashboard that visualizes French open data (elections, energy) with pre-built charts and a choropleth map. Local dev only — k8s deployment is deferred to a follow-up plan.

**Deferred to post-MVP:** k8s manifests, `/api/geo/communes` endpoint, `communes` table ingestion, `ingestion_runs` logging. These are in the spec but not needed for a working local prototype.

**Architecture:** FastAPI backend serves a REST API over PostgreSQL. React+Vite frontend renders charts (Recharts) and a France map (react-simple-maps). A Python ingestion script downloads CSV from data.gouv.fr and normalizes into PostgreSQL. All runs locally via docker-compose.

**Tech Stack:** Python 3.12, FastAPI, asyncpg, pandas, PostgreSQL 16, React 18, TypeScript, Vite, Recharts, react-simple-maps, Tailwind CSS, Docker

**Spec:** `docs/superpowers/specs/2026-03-14-etat-de-la-france-design.md`

---

## File Structure

```
/Users/ulysse/Desktop/etat/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app, CORS, lifespan
│   │   ├── db.py                    # asyncpg connection pool
│   │   ├── models.py                # Pydantic response models
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── elections.py         # /api/elections/* endpoints
│   │       ├── energie.py           # /api/energie/* endpoints
│   │       └── geo.py               # /api/geo/* endpoints
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py              # test fixtures, test DB setup
│   │   ├── test_elections.py
│   │   ├── test_energie.py
│   │   └── test_geo.py
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                  # Main app layout
│   │   ├── main.tsx                 # Entry point
│   │   ├── index.css                # Tailwind imports
│   │   ├── lib/
│   │   │   └── api.ts              # API client functions
│   │   ├── hooks/
│   │   │   └── useApi.ts           # React Query hook
│   │   └── components/
│   │       ├── KPIBar.tsx           # Sticky KPI badges
│   │       ├── ElectionsSection.tsx # Elections section wrapper
│   │       ├── FranceMap.tsx        # Choropleth map
│   │       ├── TopListes.tsx        # Horizontal bar chart
│   │       └── EnergieSection.tsx   # Energy line chart
│   ├── public/
│   │   └── france-regions.json     # TopoJSON France regions
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
├── ingest/
│   ├── ingest.py                   # Main entry point
│   ├── datasets/
│   │   ├── __init__.py
│   │   ├── geo.py                  # COG INSEE parsing
│   │   ├── elections.py            # Elections CSV parsing
│   │   └── energie.py              # Energy CSV parsing
│   ├── db.py                       # Sync psycopg2 connection + upsert helpers
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_parsing.py         # Test CSV parsing logic (no DB needed)
│   ├── Dockerfile
│   └── requirements.txt
├── sql/
│   └── init.sql                    # Full schema (CREATE TABLE statements)
├── docker-compose.yml
└── .env.example
```

---

## Chunk 1: Foundation (Database + Backend scaffold + Docker)

### Task 1: Database schema and docker-compose

**Files:**
- Create: `sql/init.sql`
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Write the SQL schema**

Create `sql/init.sql`:

```sql
CREATE TABLE IF NOT EXISTS regions (
    code VARCHAR(3) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS departements (
    code VARCHAR(3) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    region_code VARCHAR(3) REFERENCES regions(code)
);

CREATE TABLE IF NOT EXISTS communes (
    code_insee VARCHAR(5) PRIMARY KEY,
    nom VARCHAR(200) NOT NULL,
    departement_code VARCHAR(3) REFERENCES departements(code),
    region_code VARCHAR(3) REFERENCES regions(code),
    population INTEGER,
    latitude FLOAT,
    longitude FLOAT
);

CREATE TABLE IF NOT EXISTS elections (
    id SERIAL PRIMARY KEY,
    scrutin VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    niveau VARCHAR(20) NOT NULL,
    code_geo VARCHAR(5) NOT NULL,
    libelle_geo VARCHAR(200),
    inscrits INTEGER,
    votants INTEGER,
    exprimes INTEGER,
    blancs INTEGER,
    nuls INTEGER,
    liste VARCHAR(200),
    nuance VARCHAR(10),
    voix INTEGER,
    pct_voix_exprimes FLOAT,
    sieges INTEGER DEFAULT 0,
    UNIQUE (scrutin, niveau, code_geo, liste)
);

CREATE TABLE IF NOT EXISTS energie (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    pic_consommation_mw INTEGER,
    temperature_moyenne FLOAT,
    temperature_reference FLOAT
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
    id SERIAL PRIMARY KEY,
    dataset_id VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'running',
    rows_inserted INTEGER DEFAULT 0,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_elections_scrutin_niveau ON elections(scrutin, niveau, code_geo);
CREATE INDEX IF NOT EXISTS idx_energie_date ON energie(date);
```

- [ ] **Step 2: Write docker-compose.yml**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: etat
      POSTGRES_USER: etat
      POSTGRES_PASSWORD: etat
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U etat"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://etat:etat@db:5432/etat
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./frontend/src:/app/src
    depends_on:
      - backend

volumes:
  pgdata:
```

- [ ] **Step 3: Write .env.example**

```
DATABASE_URL=postgresql://etat:etat@localhost:5432/etat
```

- [ ] **Step 4: Verify DB starts**

Run: `docker compose up db -d && sleep 3 && docker compose exec db psql -U etat -c "\dt"`
Expected: Lists all 6 tables (regions, departements, communes, elections, energie, ingestion_runs)

- [ ] **Step 5: Commit**

```bash
git add sql/ docker-compose.yml .env.example
git commit -m "feat: add database schema and docker-compose"
```

---

### Task 2: Backend scaffold (FastAPI + health endpoint)

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/db.py`
- Create: `backend/app/main.py`
- Create: `backend/Dockerfile`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Write requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.0
asyncpg==0.29.0
pydantic==2.9.0
httpx==0.27.0
pytest==8.3.0
pytest-asyncio==0.24.0
```

- [ ] **Step 2: Write db.py**

```python
import asyncpg
import os

pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(os.environ["DATABASE_URL"])
    return pool


async def close_pool():
    global pool
    if pool:
        await pool.close()
        pool = None
```

- [ ] **Step 3: Write main.py**

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import get_pool, close_pool


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


@app.get("/api/health")
async def health():
    pool = await get_pool()
    row = await pool.fetchval("SELECT 1")
    return {"status": "ok", "db": row == 1}
```

- [ ] **Step 4: Write Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

- [ ] **Step 5: Write test conftest.py**

```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

- [ ] **Step 6: Verify backend starts**

Run: `docker compose up db backend -d && sleep 5 && curl http://localhost:8000/api/health`
Expected: `{"status":"ok","db":true}`

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: backend scaffold with FastAPI and health endpoint"
```

---

### Task 3: Ingestion script — geographic reference data

**Files:**
- Create: `ingest/requirements.txt`
- Create: `ingest/db.py`
- Create: `ingest/datasets/__init__.py`
- Create: `ingest/datasets/geo.py`
- Create: `ingest/ingest.py`
- Create: `ingest/tests/__init__.py`
- Create: `ingest/tests/test_parsing.py`
- Create: `ingest/Dockerfile`

- [ ] **Step 1: Write requirements.txt**

```
pandas==2.2.0
psycopg2-binary==2.9.9
requests==2.32.0
pytest==8.3.0
```

- [ ] **Step 2: Write test for geo parsing**

Create `ingest/tests/test_parsing.py`:

```python
import io
import pandas as pd
from datasets.geo import parse_regions, parse_departements


def test_parse_regions():
    csv_data = "REG,LIBELLE\n84,Auvergne-Rhône-Alpes\n27,Bourgogne-Franche-Comté"
    df = parse_regions(pd.read_csv(io.StringIO(csv_data)))
    assert len(df) == 2
    assert list(df.columns) == ["code", "nom"]
    assert df.iloc[0]["code"] == "84"
    assert df.iloc[0]["nom"] == "Auvergne-Rhône-Alpes"


def test_parse_departements():
    csv_data = "DEP,LIBELLE,REG\n01,Ain,84\n02,Aisne,32"
    df = parse_departements(pd.read_csv(io.StringIO(csv_data)))
    assert len(df) == 2
    assert list(df.columns) == ["code", "nom", "region_code"]
    assert df.iloc[0]["region_code"] == "84"
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd ingest && python -m pytest tests/test_parsing.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'datasets'`

- [ ] **Step 4: Write geo.py parsing**

```python
import pandas as pd


def parse_regions(df: pd.DataFrame) -> pd.DataFrame:
    return df.rename(columns={"REG": "code", "LIBELLE": "nom"})[["code", "nom"]]


def parse_departements(df: pd.DataFrame) -> pd.DataFrame:
    return df.rename(columns={
        "DEP": "code",
        "LIBELLE": "nom",
        "REG": "region_code",
    })[["code", "nom", "region_code"]]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd ingest && python -m pytest tests/test_parsing.py -v`
Expected: 2 passed

- [ ] **Step 6: Write db.py (sync psycopg2 helpers)**

```python
import os
import psycopg2
from psycopg2.extras import execute_values


def get_connection():
    return psycopg2.connect(os.environ.get(
        "DATABASE_URL", "postgresql://etat:etat@localhost:5432/etat"
    ))


def upsert_regions(conn, df):
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO regions (code, nom) VALUES %s
               ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom""",
            df[["code", "nom"]].values.tolist(),
        )
    conn.commit()


def upsert_departements(conn, df):
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO departements (code, nom, region_code) VALUES %s
               ON CONFLICT (code) DO UPDATE SET
                 nom = EXCLUDED.nom,
                 region_code = EXCLUDED.region_code""",
            df[["code", "nom", "region_code"]].values.tolist(),
        )
    conn.commit()
```

- [ ] **Step 7: Write ingest.py entry point (geo only for now)**

```python
import io
import sys
import pandas as pd
import requests
from db import get_connection, upsert_regions, upsert_departements
from datasets.geo import parse_regions, parse_departements

SOURCES = {
    "regions": "https://www.insee.fr/fr/statistiques/fichier/8740222/v_region_2026.csv",
    "departements": "https://www.insee.fr/fr/statistiques/fichier/8740222/v_departement_2026.csv",
}


def download_csv(url: str, sep: str = ",", encoding: str = "utf-8") -> pd.DataFrame:
    """Download CSV. French gov CSVs often use ';' separator and latin-1 encoding."""
    print(f"  Downloading {url}")
    resp = requests.get(url)
    resp.raise_for_status()
    resp.encoding = encoding
    return pd.read_csv(io.StringIO(resp.text), sep=sep)


def run_geo():
    conn = get_connection()
    try:
        print("Ingesting regions...")
        raw = download_csv(SOURCES["regions"])
        df = parse_regions(raw)
        upsert_regions(conn, df)
        print(f"  → {len(df)} regions")

        print("Ingesting departements...")
        raw = download_csv(SOURCES["departements"])
        df = parse_departements(raw)
        upsert_departements(conn, df)
        print(f"  → {len(df)} departements")
    finally:
        conn.close()


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target in ("geo", "all"):
        run_geo()
    print("Done.")
```

- [ ] **Step 8: Write Dockerfile**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENTRYPOINT ["python", "ingest.py"]
```

- [ ] **Step 9: Verify ingestion works**

Run: `docker compose up db -d && sleep 3 && cd ingest && DATABASE_URL=postgresql://etat:etat@localhost:5432/etat python ingest.py geo`
Expected: Prints "→ 18 regions" and "→ 101 departements" (approximate)

- [ ] **Step 10: Commit**

```bash
git add ingest/
git commit -m "feat: ingestion script for geographic reference data (COG INSEE)"
```

---

## Chunk 2: Elections data (ingest + API + frontend)

### Task 4: Ingestion — elections data

**Files:**
- Create: `ingest/datasets/elections.py`
- Modify: `ingest/ingest.py` (add elections runner)
- Modify: `ingest/db.py` (add elections upsert)
- Modify: `ingest/tests/test_parsing.py` (add elections test)

- [ ] **Step 1: Write test for elections parsing**

Add to `ingest/tests/test_parsing.py`:

```python
from datasets.elections import parse_elections_by_region


def test_parse_elections_region():
    # Minimal CSV mimicking data.gouv structure
    csv_data = (
        "Code région,Libellé région,Inscrits,Votants,% Votants,"
        "Exprimés,Blancs,Nuls,"
        "Numéro de panneau 1,Nuance liste 1,Libellé abrégé de liste 1,"
        "Voix 1,% Voix/exprimés 1,Sièges 1\n"
        "84,Auvergne-Rhône-Alpes,5000000,2600000,52.00%,"
        "2500000,60000,40000,"
        "1,LRN,RN,800000,32.00%,30\n"
    )
    rows = parse_elections_by_region(
        pd.read_csv(io.StringIO(csv_data)),
        scrutin="europeennes-2024",
        date="2024-06-09",
    )
    assert len(rows) == 1
    assert rows[0]["code_geo"] == "84"
    assert rows[0]["liste"] == "RN"
    assert rows[0]["voix"] == 800000
    assert rows[0]["niveau"] == "region"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ingest && python -m pytest tests/test_parsing.py::test_parse_elections_region -v`
Expected: FAIL

- [ ] **Step 3: Write elections.py parsing**

The data.gouv elections CSV has a wide format: columns repeat for each list (Voix 1, Voix 2, ... Voix 38). We need to unpivot this into rows.

```python
import pandas as pd
import re


def parse_elections_by_region(df: pd.DataFrame, scrutin: str, date: str) -> list[dict]:
    return _parse_elections(df, scrutin, date, niveau="region", code_col="Code région", libelle_col="Libellé région")


def parse_elections_by_departement(df: pd.DataFrame, scrutin: str, date: str) -> list[dict]:
    return _parse_elections(df, scrutin, date, niveau="departement", code_col="Code département", libelle_col="Libellé département")


def _parse_elections(df, scrutin, date, niveau, code_col, libelle_col):
    rows = []
    # Find how many lists there are by looking for "Voix N" columns
    list_nums = sorted(set(
        int(m.group(1))
        for col in df.columns
        if (m := re.match(r"Voix (\d+)", col))
    ))

    for _, row in df.iterrows():
        for n in list_nums:
            voix_col = f"Voix {n}"
            if voix_col not in df.columns or pd.isna(row.get(voix_col)):
                continue
            voix = int(row[voix_col]) if not pd.isna(row.get(voix_col)) else 0
            if voix == 0:
                continue

            pct_col = f"% Voix/exprimés {n}"
            pct = row.get(pct_col, 0)
            if isinstance(pct, str):
                pct = float(pct.replace("%", "").replace(",", "."))

            sieges_col = f"Sièges {n}"
            sieges = row.get(sieges_col, 0)
            if isinstance(sieges, bool):
                sieges = 0
            sieges = int(sieges) if not pd.isna(sieges) else 0

            rows.append({
                "scrutin": scrutin,
                "date": date,
                "niveau": niveau,
                "code_geo": str(row[code_col]).zfill(2),
                "libelle_geo": row[libelle_col],
                "inscrits": int(row["Inscrits"]),
                "votants": int(row["Votants"]),
                "exprimes": int(row["Exprimés"]),
                "blancs": int(row["Blancs"]),
                "nuls": int(row["Nuls"]),
                "liste": row.get(f"Libellé abrégé de liste {n}", ""),
                "nuance": row.get(f"Nuance liste {n}", ""),
                "voix": voix,
                "pct_voix_exprimes": float(pct) if pct else 0,
                "sieges": sieges,
            })
    return rows
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd ingest && python -m pytest tests/test_parsing.py -v`
Expected: 3 passed

- [ ] **Step 5: Add elections upsert to db.py**

Add to `ingest/db.py`:

```python
def upsert_elections(conn, rows: list[dict]):
    if not rows:
        return
    cols = [
        "scrutin", "date", "niveau", "code_geo", "libelle_geo",
        "inscrits", "votants", "exprimes", "blancs", "nuls",
        "liste", "nuance", "voix", "pct_voix_exprimes", "sieges",
    ]
    values = [[r[c] for c in cols] for r in rows]
    with conn.cursor() as cur:
        execute_values(
            cur,
            f"""INSERT INTO elections ({', '.join(cols)}) VALUES %s
                ON CONFLICT (scrutin, niveau, code_geo, liste) DO UPDATE SET
                  voix = EXCLUDED.voix,
                  pct_voix_exprimes = EXCLUDED.pct_voix_exprimes,
                  sieges = EXCLUDED.sieges,
                  inscrits = EXCLUDED.inscrits,
                  votants = EXCLUDED.votants,
                  exprimes = EXCLUDED.exprimes""",
            values,
        )
    conn.commit()
```

- [ ] **Step 6: Add elections runner to ingest.py**

Add to `ingest.py`:

```python
from datasets.elections import parse_elections_by_region, parse_elections_by_departement
from db import upsert_elections

ELECTIONS_SOURCES = {
    "region": "https://static.data.gouv.fr/resources/resultats-des-elections-europeennes-du-9-juin-2024/20240613-154915/resultats-definitifs-par-region.csv",
    "departement": "https://static.data.gouv.fr/resources/resultats-des-elections-europeennes-du-9-juin-2024/20240613-154909/resultats-definitifs-par-departement.csv",
}


def run_elections():
    conn = get_connection()
    try:
        print("Ingesting elections (regions)...")
        # Elections CSVs from data.gouv use ';' separator
        raw = download_csv(ELECTIONS_SOURCES["region"], sep=";")
        rows = parse_elections_by_region(raw, "europeennes-2024", "2024-06-09")
        upsert_elections(conn, rows)
        print(f"  → {len(rows)} rows")

        print("Ingesting elections (departements)...")
        raw = download_csv(ELECTIONS_SOURCES["departement"], sep=";")
        rows = parse_elections_by_departement(raw, "europeennes-2024", "2024-06-09")
        upsert_elections(conn, rows)
        print(f"  → {len(rows)} rows")
    finally:
        conn.close()
```

Update the `__main__` block:

```python
if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target in ("geo", "all"):
        run_geo()
    if target in ("elections", "all"):
        run_elections()
    print("Done.")
```

- [ ] **Step 7: Verify elections ingestion**

Run: `cd ingest && DATABASE_URL=postgresql://etat:etat@localhost:5432/etat python ingest.py elections`
Expected: Prints row counts for region and department level data

- [ ] **Step 8: Commit**

```bash
git add ingest/
git commit -m "feat: elections ingestion (européennes 2024, region + departement)"
```

---

### Task 5: Backend — elections API endpoints

**Files:**
- Create: `backend/app/models.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/app/routers/elections.py`
- Modify: `backend/app/main.py` (register router)
- Create: `backend/tests/test_elections.py`

- [ ] **Step 1: Write models.py**

```python
from pydantic import BaseModel


class ElectionResult(BaseModel):
    code_geo: str
    libelle_geo: str
    liste: str
    nuance: str
    voix: int
    pct_voix_exprimes: float
    sieges: int


class ParticipationResult(BaseModel):
    code_geo: str
    libelle_geo: str
    inscrits: int
    votants: int
    exprimes: int
    blancs: int
    nuls: int
    taux_participation: float


class EnergiePoint(BaseModel):
    date: str
    pic_consommation_mw: int | None = None
    temperature_moyenne: float | None = None
    temperature_reference: float | None = None


class GeoRegion(BaseModel):
    code: str
    nom: str


class GeoDepartement(BaseModel):
    code: str
    nom: str
    region_code: str
```

- [ ] **Step 2: Write elections router**

```python
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
```

- [ ] **Step 3: Register router in main.py**

Add to `backend/app/main.py`:

```python
from app.routers import elections

app.include_router(elections.router)
```

- [ ] **Step 4: Write test**

Create `backend/tests/test_elections.py`:

```python
import pytest


@pytest.mark.asyncio
async def test_resultats_requires_params(client):
    resp = await client.get("/api/elections/resultats")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_resultats_invalid_niveau(client):
    resp = await client.get("/api/elections/resultats?scrutin=test&niveau=invalid")
    assert resp.status_code == 422
```

- [ ] **Step 5: Run tests**

Run: `cd backend && pip install -r requirements.txt && python -m pytest tests/ -v`
Expected: Tests pass (validation tests don't need DB)

- [ ] **Step 6: Verify endpoint with real data**

Run: `curl "http://localhost:8000/api/elections/resultats?scrutin=europeennes-2024&niveau=region" | python -m json.tool | head -20`
Expected: JSON array of election results

- [ ] **Step 7: Commit**

```bash
git add backend/
git commit -m "feat: elections API endpoints (resultats + participation)"
```

---

### Task 6: Backend — energie and geo endpoints

**Files:**
- Create: `backend/app/routers/energie.py`
- Create: `backend/app/routers/geo.py`
- Modify: `backend/app/main.py` (register routers)
- Modify: `ingest/datasets/energie.py` (create)
- Modify: `ingest/ingest.py` (add energie runner)
- Modify: `ingest/db.py` (add energie upsert)

- [ ] **Step 1: Write energie ingestion**

Create `ingest/datasets/energie.py`:

```python
import pandas as pd


def parse_energie(df: pd.DataFrame) -> pd.DataFrame:
    return df.rename(columns={
        "Date": "date",
        "Pic journalier consommation (MW)": "pic_consommation_mw",
        "Température moyenne (°C)": "temperature_moyenne",
        "Température référence (°C)": "temperature_reference",
    })[["date", "pic_consommation_mw", "temperature_moyenne", "temperature_reference"]].dropna()
```

- [ ] **Step 2: Add energie upsert to ingest/db.py**

```python
def upsert_energie(conn, df):
    values = df[["date", "pic_consommation_mw", "temperature_moyenne", "temperature_reference"]].values.tolist()
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO energie (date, pic_consommation_mw, temperature_moyenne, temperature_reference)
               VALUES %s
               ON CONFLICT (date) DO UPDATE SET
                 pic_consommation_mw = EXCLUDED.pic_consommation_mw,
                 temperature_moyenne = EXCLUDED.temperature_moyenne,
                 temperature_reference = EXCLUDED.temperature_reference""",
            values,
        )
    conn.commit()
```

- [ ] **Step 3: Add energie runner to ingest.py**

```python
from datasets.energie import parse_energie
from db import upsert_energie

ENERGIE_SOURCE = "https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/pic-journalier-consommation-brute/exports/csv?use_labels=true"


def run_energie():
    conn = get_connection()
    try:
        print("Ingesting energie...")
        raw = download_csv(ENERGIE_SOURCE)
        df = parse_energie(raw)
        upsert_energie(conn, df)
        print(f"  → {len(df)} rows")
    finally:
        conn.close()
```

Update `__main__`:

```python
if target in ("energie", "all"):
    run_energie()
```

- [ ] **Step 4: Write energie router**

```python
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
    return [EnergiePoint(date=str(r["date"]), **{k: r[k] for k in r.keys() if k != "date"}) for r in rows]
```

- [ ] **Step 5: Write geo router**

```python
from fastapi import APIRouter, Query
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
```

- [ ] **Step 6: Register routers in main.py**

```python
from app.routers import elections, energie, geo

app.include_router(elections.router)
app.include_router(energie.router)
app.include_router(geo.router)
```

- [ ] **Step 7: Run full ingestion and verify all endpoints**

```bash
cd ingest && DATABASE_URL=postgresql://etat:etat@localhost:5432/etat python ingest.py all
curl "http://localhost:8000/api/energie/consommation?date_min=2024-01-01&date_max=2024-01-31" | python -m json.tool | head -10
curl "http://localhost:8000/api/geo/regions" | python -m json.tool
```

- [ ] **Step 8: Commit**

```bash
git add ingest/ backend/
git commit -m "feat: energie + geo endpoints and ingestion"
```

---

## Chunk 3: Frontend

### Task 7: Frontend scaffold (Vite + React + Tailwind)

**Files:**
- Create: `frontend/` (Vite scaffold)
- Create: `frontend/Dockerfile`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Users/ulysse/Desktop/etat
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install recharts react-simple-maps @tanstack/react-query
npm install -D @types/react-simple-maps
```

- [ ] **Step 2: Configure Tailwind**

Update `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
```

Replace `frontend/src/index.css`:

```css
@import "tailwindcss";
```

- [ ] **Step 3: Write API client**

Create `frontend/src/lib/api.ts`:

```typescript
const API_BASE = '/api'

export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export interface ElectionResult {
  code_geo: string
  libelle_geo: string
  liste: string
  nuance: string
  voix: number
  pct_voix_exprimes: number
  sieges: number
}

export interface ParticipationResult {
  code_geo: string
  libelle_geo: string
  inscrits: number
  votants: number
  exprimes: number
  taux_participation: number
}

export interface EnergiePoint {
  date: string
  pic_consommation_mw: number
  temperature_moyenne: number
  temperature_reference: number
}

export interface GeoRegion {
  code: string
  nom: string
}
```

- [ ] **Step 4: Write useApi hook**

Create `frontend/src/hooks/useApi.ts`:

```typescript
import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '../lib/api'

export function useApi<T>(key: string, path: string) {
  return useQuery<T>({
    queryKey: [key, path],
    queryFn: () => fetchJson<T>(path),
  })
}
```

- [ ] **Step 5: Write minimal App.tsx**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#fafafa]">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">État de la France</h1>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-gray-500">Dashboard coming soon...</p>
        </main>
      </div>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 6: Write Dockerfiles**

Create `frontend/Dockerfile` (production):

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Create `frontend/Dockerfile.dev` (local dev with hot reload):

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev", "--", "--host"]
```

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8000;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 7: Verify frontend starts**

Run: `cd frontend && npm run dev`
Expected: Opens on http://localhost:5173, shows "État de la France" header

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "feat: frontend scaffold with Vite, React, Tailwind, API client"
```

---

### Task 8: KPI Bar component

**Files:**
- Create: `frontend/src/components/KPIBar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write KPIBar component**

```tsx
import { useApi } from '../hooks/useApi'
import type { ParticipationResult, EnergiePoint } from '../lib/api'

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 uppercase text-xs tracking-wide">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  )
}

export default function KPIBar() {
  const { data: participation } = useApi<ParticipationResult[]>(
    'participation',
    '/elections/participation?scrutin=europeennes-2024&niveau=region'
  )
  const { data: energie } = useApi<EnergiePoint[]>(
    'energie-latest',
    '/energie/consommation?date_min=2024-01-01&date_max=2024-12-31'
  )

  const totalInscrits = participation?.reduce((s, p) => s + p.inscrits, 0) ?? 0
  const totalVotants = participation?.reduce((s, p) => s + p.votants, 0) ?? 0
  const tauxParticipation = totalInscrits > 0
    ? ((totalVotants / totalInscrits) * 100).toFixed(1)
    : '—'

  const latestEnergie = energie?.[energie.length - 1]
  const picConso = latestEnergie
    ? `${(latestEnergie.pic_consommation_mw / 1000).toFixed(1)} GW`
    : '—'
  const tempMoy = latestEnergie
    ? `${latestEnergie.temperature_moyenne.toFixed(1)}°C`
    : '—'

  return (
    <div className="flex items-center gap-6">
      <KPI label="Participation" value={`${tauxParticipation}%`} color="text-blue-600" />
      <KPI label="Pic conso" value={picConso} color="text-red-600" />
      <KPI label="Temp moy" value={tempMoy} color="text-amber-600" />
    </div>
  )
}
```

- [ ] **Step 2: Add KPIBar to App.tsx header**

Update the header in App.tsx:

```tsx
import KPIBar from './components/KPIBar'

// In the header:
<header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
  <h1 className="text-xl font-bold text-gray-900">État de la France</h1>
  <KPIBar />
</header>
```

- [ ] **Step 3: Verify in browser**

Run: Make sure backend + DB are up with data. Check http://localhost:5173
Expected: KPI badges showing real data in the sticky header

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: KPI bar with participation, energy, temperature"
```

---

### Task 9: Elections section (map + bar chart)

**Files:**
- Create: `frontend/public/france-regions.json`
- Create: `frontend/src/components/FranceMap.tsx`
- Create: `frontend/src/components/TopListes.tsx`
- Create: `frontend/src/components/ElectionsSection.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Download France regions TopoJSON**

```bash
curl -L "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions.geojson" -o frontend/public/france-regions.json
```

- [ ] **Step 2: Create shared colors constant**

Create `frontend/src/lib/colors.ts`:

```typescript
export const NUANCE_COLORS: Record<string, string> = {
  LRN: '#1a2a5e',
  LENS: '#f5a623',
  LFI: '#c9302c',
  LVEC: '#4caf50',
  LLR: '#0072bc',
  LUG: '#e91e63',
  LREC: '#5c2d91',
}
```

- [ ] **Step 3: Write FranceMap component**

```tsx
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import type { ElectionResult } from '../lib/api'
import { NUANCE_COLORS } from '../lib/colors'

interface Props {
  results: ElectionResult[]
}

export default function FranceMap({ results }: Props) {
  // Group by region, find winning list per region
  const winnerByRegion = new Map<string, string>()
  const grouped = new Map<string, ElectionResult[]>()
  results.forEach((r) => {
    const list = grouped.get(r.code_geo) ?? []
    list.push(r)
    grouped.set(r.code_geo, list)
  })
  grouped.forEach((list, code) => {
    const winner = list.reduce((a, b) => (a.voix > b.voix ? a : b))
    winnerByRegion.set(code, winner.nuance)
  })

  return (
    <ComposableMap
      projection="geoMercator"
      projectionConfig={{ center: [2.5, 46.5], scale: 2800 }}
      width={500}
      height={500}
    >
      <Geographies geography="/france-regions.json">
        {({ geographies }) =>
          geographies.map((geo) => {
            const code = geo.properties.code
            const nuance = winnerByRegion.get(code) ?? ''
            const fill = NUANCE_COLORS[nuance] ?? '#e5e7eb'
            return (
              <Geography
                key={geo.rpiKey}
                geography={geo}
                fill={fill}
                stroke="#fff"
                strokeWidth={1}
                style={{
                  hover: { fill: '#93c5fd', outline: 'none' },
                }}
              />
            )
          })
        }
      </Geographies>
    </ComposableMap>
  )
}
```

- [ ] **Step 4: Write TopListes component**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { ElectionResult } from '../lib/api'
import { NUANCE_COLORS } from '../lib/colors'

interface Props {
  results: ElectionResult[]
}

export default function TopListes({ results }: Props) {
  // Aggregate voix by liste across all regions
  const byListe = new Map<string, { liste: string; nuance: string; voix: number }>()
  results.forEach((r) => {
    const entry = byListe.get(r.liste) ?? { liste: r.liste, nuance: r.nuance, voix: 0 }
    entry.voix += r.voix
    byListe.set(r.liste, entry)
  })

  const top5 = [...byListe.values()]
    .sort((a, b) => b.voix - a.voix)
    .slice(0, 5)
    .map((d) => ({ ...d, voix_millions: +(d.voix / 1_000_000).toFixed(2) }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={top5} layout="vertical" margin={{ left: 100 }}>
        <XAxis type="number" tickFormatter={(v) => `${v}M`} />
        <YAxis type="category" dataKey="liste" width={90} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => `${v}M voix`} />
        <Bar
          dataKey="voix_millions"
          fill="#2563eb"
          radius={[0, 4, 4, 0]}
          barSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Write ElectionsSection wrapper**

```tsx
import { useApi } from '../hooks/useApi'
import type { ElectionResult } from '../lib/api'
import FranceMap from './FranceMap'
import TopListes from './TopListes'

export default function ElectionsSection() {
  const { data, isLoading, error } = useApi<ElectionResult[]>(
    'elections-region',
    '/elections/resultats?scrutin=europeennes-2024&niveau=region'
  )

  if (isLoading) return <div className="text-gray-400 py-8">Chargement...</div>
  if (error || !data) return <div className="text-red-500 py-8">Erreur de chargement</div>

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
        Élections européennes 2024
      </h2>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/2">
          <FranceMap results={data} />
        </div>
        <div className="lg:w-1/2">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Top 5 listes (voix)</h3>
          <TopListes results={data} />
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Add to App.tsx**

```tsx
import ElectionsSection from './components/ElectionsSection'

// In main:
<main className="max-w-6xl mx-auto px-6 py-8">
  <ElectionsSection />
</main>
```

- [ ] **Step 6: Verify map and chart render**

Check http://localhost:5173
Expected: France map colored by winning party + bar chart of top 5 lists

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: elections section with choropleth map and top 5 bar chart"
```

---

### Task 10: Energie section (dual axis line chart)

**Files:**
- Create: `frontend/src/components/EnergieSection.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Write EnergieSection component**

```tsx
import { useApi } from '../hooks/useApi'
import type { EnergiePoint } from '../lib/api'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export default function EnergieSection() {
  const { data, isLoading, error } = useApi<EnergiePoint[]>(
    'energie',
    '/energie/consommation?date_min=2023-01-01&date_max=2024-12-31'
  )

  if (isLoading) return <div className="text-gray-400 py-8">Chargement...</div>
  if (error || !data) return <div className="text-red-500 py-8">Erreur de chargement</div>

  // Sample data to avoid rendering 5000+ points — take every 7th point
  const sampled = data.filter((_, i) => i % 7 === 0)

  return (
    <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">
        Consommation électrique nationale
      </h2>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={sampled}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(d) => new Date(d).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}
          />
          <YAxis
            yAxisId="conso"
            orientation="left"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)} GW`}
            label={{ value: 'Consommation (GW)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
          />
          <YAxis
            yAxisId="temp"
            orientation="right"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}°C`}
            label={{ value: 'Température (°C)', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
          />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === 'pic_consommation_mw'
                ? [`${(value / 1000).toFixed(1)} GW`, 'Consommation']
                : [`${value.toFixed(1)}°C`, 'Température']
            }
            labelFormatter={(d) => new Date(d).toLocaleDateString('fr-FR')}
          />
          <Legend />
          <Line
            yAxisId="conso"
            type="monotone"
            dataKey="pic_consommation_mw"
            stroke="#dc2626"
            dot={false}
            strokeWidth={1.5}
            name="Consommation"
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperature_moyenne"
            stroke="#f59e0b"
            dot={false}
            strokeWidth={1.5}
            name="Température"
          />
        </LineChart>
      </ResponsiveContainer>
    </section>
  )
}
```

- [ ] **Step 2: Add to App.tsx**

```tsx
import EnergieSection from './components/EnergieSection'

// In main, after ElectionsSection:
<EnergieSection />
```

- [ ] **Step 3: Verify chart renders**

Check http://localhost:5173
Expected: Dual axis line chart showing consumption vs temperature

- [ ] **Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat: energy section with dual-axis line chart"
```

---

## Chunk 4: Polish and local dev

### Task 11: Final polish and README

**Files:**
- Modify: `frontend/src/App.tsx` (final layout)
- Create: `README.md`

- [ ] **Step 1: Finalize App.tsx layout**

Ensure the full layout matches the hybrid design:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import KPIBar from './components/KPIBar'
import ElectionsSection from './components/ElectionsSection'
import EnergieSection from './components/EnergieSection'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#fafafa]">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">État de la France</h1>
          <KPIBar />
        </header>
        <main className="max-w-6xl mx-auto px-6 py-8">
          <ElectionsSection />
          <EnergieSection />
          <footer className="text-center text-xs text-gray-400 mt-12 pb-8">
            Données issues de data.gouv.fr — Projet open source
          </footer>
        </main>
      </div>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: Write README.md**

```markdown
# État de la France

Dashboard de visualisation des données publiques françaises.

## Quickstart

```bash
# Start database
docker compose up db -d

# Ingest data
cd ingest && pip install -r requirements.txt
DATABASE_URL=postgresql://etat:etat@localhost:5432/etat python ingest.py all

# Start backend
cd backend && pip install -r requirements.txt
DATABASE_URL=postgresql://etat:etat@localhost:5432/etat uvicorn app.main:app --reload

# Start frontend
cd frontend && npm install && npm run dev
```

Open http://localhost:5173

## Data Sources

- [Élections européennes 2024](https://www.data.gouv.fr/datasets/resultats-des-elections-europeennes-du-9-juin-2024) (data.gouv.fr)
- [Consommation électrique](https://www.data.gouv.fr/datasets/pic-journalier-de-la-consommation-brute-delectricite) (data.gouv.fr)
- [Code Officiel Géographique](https://www.data.gouv.fr/datasets/code-officiel-geographique-cog) (INSEE)

## Stack

- **Backend**: FastAPI + asyncpg + PostgreSQL
- **Frontend**: React + Vite + Recharts + react-simple-maps + Tailwind
- **Ingestion**: Python + pandas
```

- [ ] **Step 3: Full integration test**

```bash
docker compose up db -d
cd ingest && DATABASE_URL=postgresql://etat:etat@localhost:5432/etat python ingest.py all
cd ../backend && DATABASE_URL=postgresql://etat:etat@localhost:5432/etat uvicorn app.main:app --port 8000 &
cd ../frontend && npm run dev
```

Open http://localhost:5173 and verify:
- Sticky header with KPIs showing real data
- France map colored by winning party
- Top 5 bar chart
- Energy dual axis chart

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: final layout polish and README"
```
