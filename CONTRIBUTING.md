# Contribuer à France Dashboard

Merci de votre intérêt ! Ce projet est un portail citoyen de visualisation des données publiques françaises.

## Comment contribuer

### Ajouter un nouveau dataset

1. Créer un parser dans `ingest/datasets/`
2. Ajouter l'upsert dans `ingest/db.py`
3. Ajouter le runner dans `ingest/ingest.py`
4. Créer le router API dans `backend/app/routers/`
5. Enregistrer le router dans `backend/app/main.py`
6. Mettre à jour le schema LLM dans `backend/app/llm.py`
7. Créer ou enrichir la page frontend

### Développement local

```bash
# Base de données
docker compose up db -d

# Ingestion des données
cd ingest && pip install -r requirements.txt
DATABASE_URL=postgresql://etat:etat@localhost:5432/etat python ingest.py all

# Backend
cd backend && pip install -r requirements.txt
DATABASE_URL=postgresql://etat:etat@localhost:5432/etat uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

### Règles

- **Données** : uniquement des données publiques ouvertes (data.gouv.fr, INSEE, etc.)
- **Pas de secrets** dans le code — utiliser les variables d'environnement
- **Normaliser par habitant** quand les données sont en valeur absolue
- **Les corrélations ne sont pas des causalités** — toujours le mentionner
- Les noms d'indicateurs doivent être en **français clair** pour les citoyens

### Stack

- **Backend** : Python 3.12, FastAPI, asyncpg, PostgreSQL
- **Frontend** : React 18, TypeScript, Vite, Tailwind CSS, Recharts
- **Ingestion** : Python, pandas
- **LLM** : API OpenAI-compatible (NVIDIA NIM ou Ollama)

## Licence

MIT — voir [LICENSE](LICENSE)
