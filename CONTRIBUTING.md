# Contribuer a France Dashboard

Merci de votre interet ! Ce projet est un portail citoyen de visualisation des donnees publiques francaises. Toutes les contributions sont les bienvenues.

## Demarrage rapide

```bash
# 1. Fork et clone
git clone https://github.com/<votre-user>/france-dashboard.git
cd france-dashboard

# 2. Base de donnees
docker compose up db -d

# 3. Ingestion des donnees
cd ingest && pip install -r requirements.txt
DATABASE_URL=postgresql://etat:etat@localhost:5432/etat python ingest.py all

# 4. Backend
cd ../backend && pip install -r requirements.txt
DATABASE_URL=postgresql://etat:etat@localhost:5432/etat uvicorn app.main:app --reload

# 5. Frontend
cd ../frontend && npm install && npm run dev
```

Ouvrir http://localhost:5173

## Types de contributions

### Ajouter un dataset

C'est la contribution la plus precieuse ! Etapes :

1. **Trouver la donnee** sur [data.gouv.fr](https://data.gouv.fr), INSEE, ou tout organisme public
2. **Creer le parser** dans `ingest/datasets/<nom>.py`
3. **Ajouter l'upsert** dans `ingest/db.py`
4. **Ajouter le runner** dans `ingest/ingest.py`
5. **Creer le router API** dans `backend/app/routers/<nom>.py`
6. **Enregistrer le router** dans `backend/app/main.py`
7. **Mettre a jour le schema LLM** dans `backend/app/llm.py` (pour que l'agent puisse interroger la table)
8. **Creer/enrichir la page frontend** dans `frontend/src/pages/`
9. **Ajouter le composant `DataSource`** en bas de page avec le lien vers la source

### Ameliorer le frontend

- Design, responsive, accessibilite
- Nouvelles visualisations (cartes, graphiques)
- Corrections de traduction ou de formulation

### Ameliorer le backend

- Optimisation des requetes SQL
- Nouveaux endpoints API
- Amelioration de l'agent NLQ

### Corriger un bug

Ouvrez une issue d'abord pour discuter du probleme, puis soumettez une PR.

## Conventions

### Code

- **Python** : pas de linter impose, restez coherent avec le style existant
- **TypeScript** : TypeScript strict, composants fonctionnels React
- **CSS** : Tailwind CSS, pas de CSS custom sauf cas exceptionnel
- **Nommage** : fichiers en snake_case (Python) et PascalCase (React components)

### Commits

Format : `type: description courte`

```
feat: ajout dataset accidents de la route
fix: correction calcul taux de pauvrete
ui: responsive graphique professions deputes
data: mise a jour parser elections
docs: ajout guide contribution
```

Types : `feat`, `fix`, `ui`, `data`, `docs`, `refactor`, `perf`

### Branches

```
feat/nom-du-dataset
fix/description-du-bug
ui/description-changement
```

## Regles editoriales

Ces regles sont **fondamentales** pour la credibilite du projet :

1. **Donnees publiques uniquement** — sources officielles (data.gouv.fr, INSEE, ministeres, operateurs publics)
2. **Pas de secrets** dans le code — variables d'environnement pour tout ce qui est sensible
3. **Normaliser par habitant** — les valeurs absolues sont trompeuses entre Paris et la Creuse
4. **Correlation ≠ causalite** — toujours le mentionner quand on montre une correlation
5. **Citer la source** — chaque page doit avoir un composant `DataSource` en bas
6. **Francais clair** — les indicateurs doivent etre comprehensibles par tout citoyen
7. **Pas de biais politique** — presenter les donnees de maniere neutre et factuelle

## Architecture

```
france-dashboard/
├── ingest/              # Pipeline de donnees
│   ├── datasets/        # Un fichier par dataset (telecharge + parse)
│   ├── db.py            # Fonctions upsert PostgreSQL
│   └── ingest.py        # Orchestrateur (python ingest.py all|<dataset>)
├── backend/             # API FastAPI
│   ├── app/main.py      # Point d'entree + CORS
│   ├── app/db.py        # Pool asyncpg
│   ├── app/llm.py       # Agent NLQ (text-to-SQL)
│   └── app/routers/     # Un router par thematique
├── frontend/            # React + Vite + TypeScript
│   ├── src/pages/       # Une page par thematique
│   ├── src/components/  # Composants reutilisables
│   └── src/hooks/       # Hooks custom (useApi, useIsMobile)
└── k8s/                 # Manifests Kubernetes (prod)
```

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Backend | Python 3.12, FastAPI, asyncpg, PostgreSQL 16 |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Recharts, react-simple-maps |
| Ingestion | Python, pandas |
| LLM | API OpenAI-compatible (NVIDIA NIM ou Ollama local) |
| Infra | Docker Compose (dev), K3s + FluxCD (prod) |

## Agent NLQ

Si vous ajoutez un dataset, pensez a mettre a jour le schema dans `backend/app/llm.py` :

```python
SCHEMA = """...
VOTRE_TABLE :
- ma_table (colonne1 TYPE, colonne2 TYPE, ...)
  JOIN: code_departement = departements.code
..."""
```

L'agent utilise ce schema pour generer des requetes SQL a partir de questions en langage naturel.

## Besoin d'aide ?

- Ouvrez une [issue](https://github.com/hermias1/france-dashboard/issues)
- Les issues taguees `good first issue` sont ideales pour commencer

## Licence

MIT — voir [LICENSE](LICENSE)
