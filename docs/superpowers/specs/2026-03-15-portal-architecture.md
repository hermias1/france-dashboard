# État de la France — Portal Architecture

## Vision

Un portail citoyen qui permet de comprendre la France à travers ses données publiques. Pas un dashboard statique — un outil d'exploration interconnecté où chaque donnée mène à une autre.

## Navigation

### Mode hybride : thématique + territoire

**Navigation principale** (sidebar gauche) :
- Accueil (highlights + KPIs nationaux)
- Élections (EU 2024, Présidentielle 2022, historique)
- Économie (immobilier, loyers, revenus, entreprises)
- Sécurité (délinquance par type, évolution)
- Énergie & Climat (consommation, température)
- Santé (dépenses, déserts médicaux, autonomie)
- Éducation (brevet, pesticides écoles)
- Transport (accidents route)
- Numérique (fibre optique)
- Politique (députés, assemblée)

**Portrait de territoire** :
- Accessible depuis n'importe quelle page en cliquant sur un département/commune dans une carte
- Volet latéral ou page dédiée /territoire/:code
- Agrège tous les indicateurs disponibles pour ce territoire
- Compare avec la moyenne nationale et les territoires similaires

### Agent NLQ

- **Barre latérale droite** persistante, accessible depuis toutes les pages
- L'agent peut croiser toutes les thématiques
- Génère des charts dynamiques dans le panneau latéral
- Historique des questions posées

## Design

### Style : étatique moderne

Inspiré des sites gouvernementaux modernes (DSFR) mais avec plus de personnalité data-journalisme.

- **Couleurs** : bleu République (#000091) comme accent principal, fond clair, gris subtils
- **Typographie** : Marianne (police officielle de l'État) ou system font
- **Composants** : cards avec bordures fines, badges, tooltips riches
- **Sidebar** : fond sombre (#1e1e2f), icônes + labels, collapsible
- **Cartes** : choroplèthes interactives, hover = tooltip, click = portrait territoire
- **Graphiques** : Recharts, palette cohérente par thématique

### Pages types

**Page thématique** :
```
[Sidebar] | [Header avec filtres (année, niveau géo)]
          | [KPIs de la thématique]
          | [Carte choroplèthe | Graphique principal]
          | [Graphiques secondaires en grid]
          | [Tableau de données filtrable]
```

**Portrait de territoire** :
```
[Sidebar] | [Header : nom département + région + population]
          | [Grid de KPIs : prix/m², délinquance, participation, ...]
          | [Mini-cartes de situation]
          | [Comparaison avec moyenne nationale]
```

**Accueil** :
```
[Sidebar] | [Hero : "Comprendre la France par les données"]
          | [Barre de recherche NLQ proéminente]
          | [Grid de highlights : "Le saviez-vous ?" avec stats surprenantes]
          | [Cartes miniatures par thématique]
```

## Stack technique

- **React + React Router** (migration depuis SPA actuel)
- **Tailwind CSS** (déjà en place)
- **Recharts** (charts)
- **react-simple-maps** (cartes)
- **@tanstack/react-query** (data fetching, déjà en place)
- **FastAPI** (backend, déjà en place)
- **PostgreSQL** (DB, déjà en place)

### Structure de fichiers frontend (cible)

```
frontend/src/
├── main.tsx
├── App.tsx                    # Router setup
├── layouts/
│   └── MainLayout.tsx         # Sidebar + content area + NLQ panel
├── pages/
│   ├── Home.tsx
│   ├── Elections.tsx
│   ├── Economie.tsx
│   ├── Securite.tsx
│   ├── Energie.tsx
│   ├── Sante.tsx
│   ├── Education.tsx
│   ├── Transport.tsx
│   ├── Numerique.tsx
│   ├── Politique.tsx
│   └── Territoire.tsx         # /territoire/:code
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── NLQPanel.tsx       # Right sidebar agent
│   │   └── PageHeader.tsx
│   ├── maps/
│   │   ├── FranceMap.tsx
│   │   └── DepartementDetail.tsx
│   ├── charts/
│   │   ├── DynamicChart.tsx
│   │   ├── KPICard.tsx
│   │   └── DataTable.tsx
│   └── shared/
│       ├── Loader.tsx
│       └── ErrorCard.tsx
├── hooks/
│   └── useApi.ts
└── lib/
    ├── api.ts
    └── colors.ts
```

## Datasets à intégrer

### Priorité 1 (prochaine session)
- Accidents de la route 2024 (CSV direct, par département)
- Couverture fibre optique (CSV direct, par commune)
- Carte des loyers par commune 2025
- Résultats du Brevet par établissement

### Priorité 2
- Revenus IRCOM par département (ZIP → CSV)
- Dépenses de santé
- Déserts médicaux (APL médecins généralistes)
- Créations d'entreprises par commune

### Priorité 3 (données originales)
- Pression pesticides autour des écoles (Le Monde)
- Désinformation climatique dans les médias
- Projections personnes âgées
- Députés et données parlementaires

## Plan d'implémentation

1. **Refactor multi-pages** : React Router, MainLayout avec sidebar, migration des composants existants
2. **Page Accueil** : hero, barre NLQ, highlights
3. **Portrait de territoire** : page /territoire/:code avec agrégation
4. **Ingestion batch** : accidents, fibre, loyers, brevet
5. **Pages thématiques** : une par une, en réutilisant les composants
6. **NLQ sidebar** : panneau latéral persistant
7. **Polish** : design system DSFR-inspired, animations, responsive
