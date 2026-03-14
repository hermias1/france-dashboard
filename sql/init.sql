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

CREATE TABLE IF NOT EXISTS delinquance (
    id SERIAL PRIMARY KEY,
    code_departement VARCHAR(3) NOT NULL,
    annee INTEGER NOT NULL,
    indicateur VARCHAR(100) NOT NULL,
    nombre INTEGER,
    taux_pour_mille FLOAT,
    population INTEGER,
    UNIQUE (code_departement, annee, indicateur)
);

CREATE TABLE IF NOT EXISTS immobilier (
    id SERIAL PRIMARY KEY,
    code_commune VARCHAR(5) NOT NULL,
    annee INTEGER NOT NULL,
    nb_mutations INTEGER,
    nb_maisons INTEGER,
    nb_apparts INTEGER,
    prix_moyen INTEGER,
    prix_m2_moyen INTEGER,
    surface_moyenne INTEGER,
    UNIQUE (code_commune, annee)
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
CREATE INDEX IF NOT EXISTS idx_delinquance_dept_annee ON delinquance(code_departement, annee);
CREATE INDEX IF NOT EXISTS idx_immobilier_commune_annee ON immobilier(code_commune, annee);
