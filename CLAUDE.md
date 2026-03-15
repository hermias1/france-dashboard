# CLAUDE.md — France Dashboard

## Project Overview
Citizen portal for French open data visualization. Live at francedashboard.fr.

## Architecture
- `backend/` — FastAPI REST API (Python 3.12, asyncpg, PostgreSQL)
- `frontend/` — React 18 + Vite + Tailwind + Recharts + react-simple-maps
- `ingest/` — Data ingestion scripts (pandas, psycopg2)
- `sql/init.sql` — Database schema
- `docker-compose.yml` — Local dev environment

## Key patterns
- Each dataset follows: parser → upsert → runner → API router → frontend page
- Parsers are in `ingest/datasets/`, one file per dataset
- API routers are in `backend/app/routers/`, registered in `main.py`
- The LLM schema in `backend/app/llm.py` must be updated when adding tables
- The insights engine in `backend/app/routers/insights.py` auto-discovers correlations
- All maps use react-simple-maps with projection center [2.8, 46.2] scale 2200

## Running locally
```bash
docker compose up db -d
cd ingest && DATABASE_URL=postgresql://etat:etat@localhost:5432/etat python3 ingest.py all
cd backend && DATABASE_URL=postgresql://etat:etat@localhost:5432/etat uvicorn app.main:app --reload
cd frontend && npm run dev
```

## Important
- Never commit secrets (.env is gitignored)
- Normalize data per capita when showing absolute counts
- French CSV files often use `;` separator and `,` decimal
- Correlations ≠ causation — always disclaim
- The `communes` table exists but is EMPTY — don't reference it in SQL
