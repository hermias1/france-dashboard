# État de la France — Design Spec

## Overview

A public-facing dashboard that visualizes French open data from data.gouv.fr. Targets curious citizens who want to explore key national indicators (elections, energy consumption) through pre-built visualizations in a clean editorial style.

## Architecture

Three components deployed in a `etat` namespace on an existing k3s homelab cluster (4 nodes, FluxCD, Traefik).

```
Frontend (React+Vite/nginx) → Backend (FastAPI) → PostgreSQL
                                                      ↑
                                          CronJob ingest (weekly)
                                          downloads CSV from data.gouv
```

- **Frontend**: React + Vite, static build served by nginx. Recharts for charts, react-simple-maps + TopoJSON for the choropleth map. GeoJSON source: `gregoiredavid/france-geojson` (GitHub), bundled as a static asset in the frontend build.
- **Backend**: FastAPI (Python), read-only REST API. Queries PostgreSQL.
- **CronJob ingest**: Python script running weekly as a k8s CronJob. Downloads CSV resources from data.gouv.fr (via HTTP, not the MCP), normalizes them, and inserts into PostgreSQL.
- **Database**: PostgreSQL StatefulSet with PVC.
- **LLM (future)**: LiteLLM proxy already running in the `forensicagent` namespace. Will be used for natural language question features post-MVP.

### Why this architecture

- Matches the existing app pattern in the homelab (dream-analyze, gemme, mandalearn all follow namespace/database/backend/frontend/ingress).
- Ingestion is decoupled because data.gouv datasets update infrequently (monthly at most) and the download/normalize process is heavy — it shouldn't block API requests.
- Read-only API keeps things simple. No auth needed for public data.

## Data Model

### Reference tables

```sql
CREATE TABLE regions (
    code VARCHAR(3) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL
);

CREATE TABLE departements (
    code VARCHAR(3) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    region_code VARCHAR(3) REFERENCES regions(code)
);

CREATE TABLE communes (
    code_insee VARCHAR(5) PRIMARY KEY,
    nom VARCHAR(200) NOT NULL,
    departement_code VARCHAR(3) REFERENCES departements(code),
    region_code VARCHAR(3) REFERENCES regions(code),
    population INTEGER,
    latitude FLOAT,
    longitude FLOAT
);
```

### Thematic tables

```sql
CREATE TABLE elections (
    id SERIAL PRIMARY KEY,
    scrutin VARCHAR(50) NOT NULL,        -- e.g. 'europeennes-2024'
    date DATE NOT NULL,
    niveau VARCHAR(20) NOT NULL,          -- 'region', 'departement', 'commune'
    code_geo VARCHAR(5) NOT NULL,         -- code region/dept/commune
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

CREATE TABLE energie (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,           -- national-level only, one row per day
    pic_consommation_mw INTEGER,
    temperature_moyenne FLOAT,
    temperature_reference FLOAT
);
```

### Ingestion tracking

```sql
CREATE TABLE ingestion_runs (
    id SERIAL PRIMARY KEY,
    dataset_id VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'running',  -- running, success, failed
    rows_inserted INTEGER DEFAULT 0,
    error_message TEXT
);
```

### Key design decisions

- **Code INSEE as universal join key** across all geographic tables.
- **Elections table is denormalized**: one row per list per geographic unit per election. This makes aggregation queries (top lists, participation rates) simple and fast.
- **Energie is national-level only** for MVP. No commune-level granularity available in the data.gouv dataset.
- Indexes on `elections(scrutin, niveau, code_geo)` and `energie(date)`.
- **UNIQUE constraints** on natural keys enable `INSERT ... ON CONFLICT DO UPDATE` for idempotent re-ingestion.
- **No migration tool** for MVP — schema is created via init SQL on first database start. Since all data is re-ingested from source, a schema change means dropping and recreating tables (data is reproducible).
- **No backup needed** — all data can be re-ingested from data.gouv.fr at any time.

## API Endpoints

```
GET /api/health
GET /api/elections/resultats?scrutin=europeennes-2024&niveau=region
GET /api/elections/resultats?scrutin=europeennes-2024&niveau=departement
GET /api/elections/participation?scrutin=europeennes-2024&niveau=region
GET /api/energie/consommation?date_min=2023-01-01&date_max=2024-12-31
GET /api/geo/regions
GET /api/geo/departements
GET /api/geo/communes?search=Lyon
```

All endpoints return JSON. No authentication. CORS allows all origins for MVP (public data).

**Note:** `/api/energie/consommation` has no geographic filtering — energy data is national-level only. The frontend should not offer region/department filtering on energy charts.

## Frontend Design

### Layout: Hybrid (sticky KPIs + scrollable thematic sections)

- **Header**: "État de la France" title + inline KPI badges (participation %, pic conso, temp moyenne)
- **Section Élections européennes 2024**: Choropleth map of France by region (colored by winning list) + horizontal bar chart of top 5 lists nationally
- **Section Énergie**: Dual-axis line chart — daily electricity consumption (MW) vs average temperature (°C)

### Visual style: Light editorial

- White/light gray background (#fafafa)
- Clean typography (Inter or system font)
- Cards with subtle borders (#e5e7eb)
- Accent colors: blue (#2563eb) for elections, red (#dc2626) for energy
- Inspired by Le Monde Décodeurs / data journalism aesthetic

### Libraries

- **Recharts** for bar charts and line charts
- **react-simple-maps** with TopoJSON for the France choropleth (simpler than Leaflet for a static map, good enough for region/department level)
- **Tailwind CSS** for styling

## Ingestion Pipeline

### MVP datasets

1. **Élections européennes 2024 par région** — resource `7c3a854b-7344-4c68-b1f9-9d651b4ca823` (CSV, 70KB, Tabular API ✅)
2. **Élections européennes 2024 par département** — resource `b77cc4da-644f-4323-b6f7-ae6fe9b33f86` (CSV, 388KB, Tabular API ✅)
3. **Pic journalier consommation électricité** — resource `d2b06d10-d8e0-4c4e-a02d-245f1ea7b7fd` (CSV, 5083 rows, Tabular API ✅)
4. **COG INSEE 2026 — Régions** — resource `f7057d4e-0078-45de-95b7-2a0ce6594807` → `v_region_2026.csv` (direct download from insee.fr)
5. **COG INSEE 2026 — Départements** — resource `e5f32177-5841-4a46-9c17-f8ff94bd38fc` → `v_departement_2026.csv`
6. **COG INSEE 2026 — Communes** — resource `c5800591-813b-4ce2-9a3f-739a9c5d9558` → `v_commune_2026.csv` (deferred to post-MVP — MVP only needs region/department level)

### Process

1. Download CSV via HTTP (direct URL from data.gouv resource metadata)
2. Parse with pandas
3. Normalize column names, clean data types
4. Upsert into PostgreSQL (idempotent — safe to re-run)
5. Log run in `ingestion_runs`

### Schedule

Weekly CronJob (Sunday 3am). Data.gouv datasets update at most monthly.

## Kubernetes Manifests

Following existing homelab pattern:

```
clusters/homelab/apps/etat/
├── namespace/
│   └── 00-namespace.yaml
├── database/
│   ├── 00-pvc.yaml              (5Gi)
│   ├── 01-statefulset.yaml      (postgres:16-alpine)
│   ├── 02-service.yaml
│   └── 03-configmap.yaml        (init SQL schema)
├── backend/
│   ├── 01-deployment.yaml       (fastapi image from GHCR)
│   └── 02-service.yaml
├── frontend/
│   ├── 01-deployment.yaml       (nginx image from GHCR)
│   └── 02-service.yaml
├── ingress/
│   ├── 00-security-block.yaml
│   └── 01-ingressroute.yaml
├── secrets/
│   ├── 01-secrets.yaml          (DB credentials, SOPS encrypted)
│   └── 02-ghcr-secret.yaml
├── ingest/
│   └── 01-cronjob.yaml          (weekly ingestion)
└── kustomization.yaml
```

## Source Code Structure

```
/Users/ulysse/Desktop/etat/
├── backend/
│   ├── app/
│   │   ├── main.py              (FastAPI app)
│   │   ├── routers/
│   │   │   ├── elections.py
│   │   │   ├── energie.py
│   │   │   └── geo.py
│   │   ├── db.py                (database connection)
│   │   └── models.py            (Pydantic response models)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── KPIBar.tsx
│   │   │   ├── ElectionsSection.tsx
│   │   │   ├── EnergieSection.tsx
│   │   │   └── FranceMap.tsx
│   │   ├── hooks/
│   │   │   └── useApi.ts
│   │   └── lib/
│   │       └── api.ts
│   ├── Dockerfile
│   └── package.json
├── ingest/
│   ├── ingest.py                (main ingestion script)
│   ├── datasets/
│   │   ├── elections.py         (elections-specific parsing)
│   │   └── energie.py           (energie-specific parsing)
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml           (local dev)
├── .github/workflows/           (CI: build + push images)
└── docs/
```

## Local Development

`docker-compose.yml` spins up PostgreSQL + backend + frontend for local dev.

```
Environment variables:
  DATABASE_URL=postgresql://etat:etat@db:5432/etat
  FRONTEND_API_URL=http://localhost:8000   (Vite proxy in dev)
```

Backend runs on port 8000, frontend on port 5173 (Vite dev server). PostgreSQL on 5432.

## MVP Scope

**In:**
- 4 KPIs (inscrits, participation, pic conso, temp moyenne)
- Choropleth map of election results by region
- Bar chart of top lists nationally
- Line chart of energy consumption vs temperature
- Weekly automated data ingestion
- Deployed on homelab k3s

**Out (future):**
- Natural language question bar (needs LLM integration)
- Portrait de commune
- "Surprends-moi" correlation finder
- Additional datasets (immobilier, éducation, santé)
- Time machine slider
- Data export
