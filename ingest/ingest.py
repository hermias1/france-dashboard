import io
import sys
import pandas as pd
import requests
from db import (get_connection, upsert_regions, upsert_departements, upsert_elections,
                upsert_energie, upsert_delinquance, upsert_immobilier,
                upsert_accidents, upsert_fibre, upsert_loyers, upsert_brevet,
                upsert_apl_medecins, upsert_elus, upsert_chomage,
                upsert_desinfo_climat)
from datasets.geo import parse_regions, parse_departements
from datasets.elections import parse_elections_by_region, parse_elections_by_departement
from datasets.energie import parse_energie
from datasets.delinquance import parse_delinquance_departement
from datasets.immobilier import parse_immobilier_communes
from datasets.presidentielle import parse_presidentielle_raw
from datasets.accidents import parse_accidents
from datasets.fibre import parse_fibre
from datasets.loyers import parse_loyers
from datasets.brevet import parse_brevet
from datasets.apl_medecins import parse_apl_medecins
from datasets.elus import parse_deputes, parse_senateurs, parse_maires
from datasets.chomage import parse_chomage
from datasets.desinfo_climat import parse_desinfo_climat

GEO_SOURCES = {
    "regions": "https://www.insee.fr/fr/statistiques/fichier/8740222/v_region_2026.csv",
    "departements": "https://www.insee.fr/fr/statistiques/fichier/8740222/v_departement_2026.csv",
}

ELECTIONS_SOURCES = {
    "region": "https://static.data.gouv.fr/resources/resultats-des-elections-europeennes-du-9-juin-2024/20240613-154915/resultats-definitifs-par-region.csv",
    "departement": "https://static.data.gouv.fr/resources/resultats-des-elections-europeennes-du-9-juin-2024/20240613-154909/resultats-definitifs-par-departement.csv",
}

ENERGIE_SOURCE = "https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/pic-journalier-consommation-brute/exports/csv?use_labels=true"

DELINQUANCE_SOURCE = "https://static.data.gouv.fr/resources/bases-statistiques-communale-departementale-et-regionale-de-la-delinquance-enregistree-par-la-police-et-la-gendarmerie-nationales/20260129-160318/donnee-dep-data.gouv-2025-geographie2025-produit-le2026-01-22.csv"

PRESIDENTIELLE_SOURCE = "https://static.data.gouv.fr/resources/election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-1er-tour/20220414-152356/resultats-par-niveau-dpt-t1-france-entiere.txt"

IMMOBILIER_SOURCES = [
    f"https://static.data.gouv.fr/resources/indicateurs-immobiliers-par-commune-et-par-annee-prix-et-volumes-sur-la-periode-2014-2024/20250707-085855/communesdvf2024.csv",
]

ACCIDENTS_SOURCE = "https://static.data.gouv.fr/resources/bases-de-donnees-annuelles-des-accidents-corporels-de-la-circulation-routiere-annees-de-2005-a-2024/20251021-115900/caract-2024.csv"
FIBRE_SOURCE = "https://static.data.gouv.fr/resources/indicateur-france-tres-haut-debit-etat-des-deploiements-de-la-fibre-optique-et-decommissionnement-du-cuivre/20251216-132516/indicateur-france-tres-haut-debit-ftth-cu.csv"
LOYERS_SOURCE = "https://static.data.gouv.fr/resources/carte-des-loyers-indicateurs-de-loyers-dannonce-par-commune-en-2025/20251211-145010/pred-app-mef-dhup.csv"
BREVET_SOURCE = "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-dnb-par-etablissement/exports/csv?use_labels=true"
APL_SOURCE = "https://data.drees.solidarites-sante.gouv.fr/api/v2/catalog/datasets/530_l-accessibilite-potentielle-localisee-apl/attachments/indicateur_d_accessibilite_potentielle_localisee_apl_aux_medecins_generalistes_xlsx"

CHOMAGE_SOURCE = "https://data.dares.travail-emploi.gouv.fr/api/explore/v2.1/catalog/datasets/dares_defm_stock_regions_brut_mens/exports/csv?use_labels=true&limit=50000"
DESINFO_CLIMAT_SOURCE = "https://static.data.gouv.fr/resources/etat-de-la-mesinformation-et-desinformation-climatique-dans-les-medias-audiovisuels-en-2025/20251105-151339/misinformation-per-media.csv"

ELUS_SOURCES = {
    "deputes": "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/20251223-104106/elus-deputes-dep.csv",
    "senateurs": "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/20251223-104017/elus-senateurs-sen.csv",
    "maires": "https://static.data.gouv.fr/resources/repertoire-national-des-elus-1/20251223-104211/elus-maires-mai.csv",
}


def download_csv(url: str, sep: str = ",", encoding: str = "utf-8") -> pd.DataFrame:
    """Download CSV. Use encoding param to decode response bytes correctly."""
    print(f"  Downloading {url}")
    resp = requests.get(url)
    resp.raise_for_status()
    text = resp.content.decode(encoding)
    return pd.read_csv(io.StringIO(text), sep=sep)


def run_geo():
    conn = get_connection()
    try:
        print("Ingesting regions...")
        raw = download_csv(GEO_SOURCES["regions"], sep=",")
        df = parse_regions(raw)
        upsert_regions(conn, df)
        print(f"  → {len(df)} regions")

        print("Ingesting departements...")
        raw = download_csv(GEO_SOURCES["departements"], sep=",")
        df = parse_departements(raw)
        upsert_departements(conn, df)
        print(f"  → {len(df)} departements")
    finally:
        conn.close()


def run_elections():
    conn = get_connection()
    try:
        print("Ingesting elections (regions)...")
        raw = download_csv(ELECTIONS_SOURCES["region"], sep=";", encoding="utf-8")
        rows = parse_elections_by_region(raw, "europeennes-2024", "2024-06-09")
        upsert_elections(conn, rows)
        print(f"  → {len(rows)} rows")

        print("Ingesting elections (departements)...")
        raw = download_csv(ELECTIONS_SOURCES["departement"], sep=";", encoding="utf-8")
        rows = parse_elections_by_departement(raw, "europeennes-2024", "2024-06-09")
        upsert_elections(conn, rows)
        print(f"  → {len(rows)} rows")
    finally:
        conn.close()


def run_energie():
    conn = get_connection()
    try:
        print("Ingesting energie...")
        raw = download_csv(ENERGIE_SOURCE, sep=";")
        df = parse_energie(raw)
        upsert_energie(conn, df)
        print(f"  → {len(df)} rows")
    finally:
        conn.close()


def run_delinquance():
    conn = get_connection()
    try:
        print("Ingesting delinquance (departements)...")
        raw = download_csv(DELINQUANCE_SOURCE, sep=";")
        df = parse_delinquance_departement(raw)
        upsert_delinquance(conn, df)
        print(f"  → {len(df)} rows")
    finally:
        conn.close()


def run_presidentielle():
    conn = get_connection()
    try:
        print("Ingesting presidentielle 2022 T1 (departements)...")
        print(f"  Downloading {PRESIDENTIELLE_SOURCE}")
        resp = requests.get(PRESIDENTIELLE_SOURCE)
        resp.raise_for_status()
        text = resp.content.decode("cp1252")
        rows = parse_presidentielle_raw(text, "presidentielle-2022-t1", "2022-04-10")
        upsert_elections(conn, rows)
        print(f"  → {len(rows)} rows")
    finally:
        conn.close()


def run_immobilier():
    conn = get_connection()
    try:
        for url in IMMOBILIER_SOURCES:
            print(f"Ingesting immobilier...")
            raw = download_csv(url, sep=",")
            df = parse_immobilier_communes(raw)
            upsert_immobilier(conn, df)
            print(f"  → {len(df)} rows")
    finally:
        conn.close()


def run_accidents():
    conn = get_connection()
    try:
        print("Ingesting accidents...")
        raw = download_csv(ACCIDENTS_SOURCE, sep=";")
        df = parse_accidents(raw)
        upsert_accidents(conn, df)
        print(f"  → {len(df)} rows")
    finally:
        conn.close()


def run_fibre():
    conn = get_connection()
    try:
        print("Ingesting fibre...")
        raw = download_csv(FIBRE_SOURCE, sep=",")
        df = parse_fibre(raw)
        upsert_fibre(conn, df)
        print(f"  → {len(df)} rows")
    finally:
        conn.close()


def run_loyers():
    conn = get_connection()
    try:
        print("Ingesting loyers...")
        raw = download_csv(LOYERS_SOURCE, sep=";", encoding="latin-1")
        df = parse_loyers(raw)
        upsert_loyers(conn, df)
        print(f"  → {len(df)} rows")
    finally:
        conn.close()


def run_brevet():
    conn = get_connection()
    try:
        print("Ingesting brevet...")
        raw = download_csv(BREVET_SOURCE, sep=";")
        df = parse_brevet(raw)
        upsert_brevet(conn, df)
        print(f"  → {len(df)} rows")
    finally:
        conn.close()


def run_apl():
    conn = get_connection()
    try:
        print("Ingesting APL médecins...")
        print(f"  Downloading APL médecins XLSX...")
        resp = requests.get(APL_SOURCE)
        resp.raise_for_status()
        df = pd.read_excel(io.BytesIO(resp.content), sheet_name='APL 2023', skiprows=8)
        df = df.iloc[1:]  # skip units row
        parsed = parse_apl_medecins(df)
        upsert_apl_medecins(conn, parsed)
        print(f"  → {len(parsed)} rows")
    finally:
        conn.close()


def run_elus():
    conn = get_connection()
    try:
        parsers = [
            ("deputes", parse_deputes),
            ("senateurs", parse_senateurs),
            ("maires", parse_maires),
        ]
        for name, parser in parsers:
            print(f"Ingesting elus ({name})...")
            url = ELUS_SOURCES[name]
            print(f"  Downloading {url}")
            resp = requests.get(url)
            resp.raise_for_status()
            text = resp.content.decode("utf-8")
            df = parser(text)
            upsert_elus(conn, df)
            print(f"  → {len(df)} rows")
    finally:
        conn.close()


def run_chomage():
    conn = get_connection()
    try:
        print("Ingesting chomage...")
        raw = download_csv(CHOMAGE_SOURCE, sep=";")
        df = parse_chomage(raw)
        upsert_chomage(conn, df)
        print(f"  → {len(df)} rows")
    finally:
        conn.close()


def run_desinfo_climat():
    conn = get_connection()
    try:
        print("Ingesting desinfo climat...")
        print(f"  Downloading {DESINFO_CLIMAT_SOURCE}")
        resp = requests.get(DESINFO_CLIMAT_SOURCE)
        resp.raise_for_status()
        # Handle BOM
        text = resp.content.decode("utf-8-sig")
        raw = pd.read_csv(io.StringIO(text), sep=";")
        df = parse_desinfo_climat(raw)
        upsert_desinfo_climat(conn, df)
        print(f"  → {len(df)} rows")
    finally:
        conn.close()


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target in ("geo", "all"):
        run_geo()
    if target in ("elections", "all"):
        run_elections()
    if target in ("energie", "all"):
        run_energie()
    if target in ("delinquance", "all"):
        run_delinquance()
    if target in ("presidentielle", "all"):
        run_presidentielle()
    if target in ("immobilier", "all"):
        run_immobilier()
    if target in ("accidents", "all"):
        run_accidents()
    if target in ("fibre", "all"):
        run_fibre()
    if target in ("loyers", "all"):
        run_loyers()
    if target in ("brevet", "all"):
        run_brevet()
    if target in ("apl", "all"):
        run_apl()
    if target in ("chomage", "all"):
        run_chomage()
    if target in ("desinfo_climat", "all"):
        run_desinfo_climat()
    if target in ("elus", "all"):
        run_elus()
    print("Done.")
