# 🇫🇷 France Dashboard

**[francedashboard.fr](https://francedashboard.fr)** — Portail citoyen de visualisation des données publiques françaises.

Explorez les élections, l'économie, la sécurité, l'énergie, la santé, l'éducation — croisez les indicateurs, comparez les départements, posez vos questions en langage naturel.

## Fonctionnalités

- **10 thématiques** : Élections, Économie, Sécurité, Énergie, Santé, Éducation, Transport, Numérique, Environnement, Politique
- **Portrait de territoire** : tapez votre département, voyez son score sur tous les indicateurs
- **Moteur de découvertes** : corrélations automatiques entre indicateurs (ex: "les départements où les violences sont élevées ont une participation électorale plus faible")
- **Agent NLQ** : posez des questions en français, l'IA génère le SQL et les graphiques
- **Mode Versus** : comparez deux départements face à face
- **Quiz** : testez vos connaissances sur la France

## Données

15 datasets, ~450K lignes, 100% open data :

| Source | Données | Granularité |
|--------|---------|-------------|
| data.gouv.fr | Élections EU 2024, Présidentielle 2022, Législatives 2024 | Département |
| data.gouv.fr | Délinquance (15 indicateurs, 2016-2025) | Département |
| data.gouv.fr | Prix immobilier DVF (2018-2024) | Commune |
| data.gouv.fr | Loyers 2025 | Commune |
| data.gouv.fr | Accidents de la route 2024 | Département |
| data.gouv.fr | Couverture fibre FTTH | Commune |
| data.gouv.fr | Résultats Brevet | Département |
| data.gouv.fr | Élus (députés, sénateurs, maires) | Individu |
| data.gouv.fr | Désinformation climatique | Média |
| DREES | Accessibilité médecins (APL) | Commune |
| RTE | Mix énergétique (éco2mix) | National/jour |
| RTE | Consommation électrique + température | National/jour |

## Stack technique

- **Backend** : FastAPI + asyncpg + PostgreSQL 16
- **Frontend** : React 18 + Vite + Tailwind CSS + Recharts + react-simple-maps
- **Ingestion** : Python + pandas (CronJob hebdomadaire)
- **LLM** : NVIDIA NIM API (Qwen 2.5 Coder 32B) — compatible Ollama
- **Infra** : Docker Compose (dev) / K3s + FluxCD (prod)

## Quickstart

```bash
# Démarrer la base de données
docker compose up db -d

# Ingérer les données
cd ingest && pip install -r requirements.txt
DATABASE_URL=postgresql://etat:etat@localhost:5432/etat python ingest.py all

# Démarrer le backend
cd backend && pip install -r requirements.txt
DATABASE_URL=postgresql://etat:etat@localhost:5432/etat uvicorn app.main:app --reload

# Démarrer le frontend
cd frontend && npm install && npm run dev
```

Ouvrir http://localhost:5173

## Variables d'environnement

```bash
DATABASE_URL=postgresql://etat:etat@localhost:5432/etat

# Option 1 : NVIDIA NIM (cloud)
NVIDIA_NIM_API_KEY=nvapi-xxx

# Option 2 : Ollama (local)
OLLAMA_URL=http://localhost:11434
LLM_MODEL=qwen2.5-coder:7b
```

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md). Les contributions sont les bienvenues — ajout de datasets, amélioration du design, nouveaux croisements de données.

## Licence

MIT — voir [LICENSE](LICENSE)
