import io
import sys
import pandas as pd
import requests
from db import get_connection, upsert_regions, upsert_departements, upsert_elections, upsert_energie
from datasets.geo import parse_regions, parse_departements
from datasets.elections import parse_elections_by_region, parse_elections_by_departement
from datasets.energie import parse_energie

GEO_SOURCES = {
    "regions": "https://www.insee.fr/fr/statistiques/fichier/8740222/v_region_2026.csv",
    "departements": "https://www.insee.fr/fr/statistiques/fichier/8740222/v_departement_2026.csv",
}

ELECTIONS_SOURCES = {
    "region": "https://static.data.gouv.fr/resources/resultats-des-elections-europeennes-du-9-juin-2024/20240613-154915/resultats-definitifs-par-region.csv",
    "departement": "https://static.data.gouv.fr/resources/resultats-des-elections-europeennes-du-9-juin-2024/20240613-154909/resultats-definitifs-par-departement.csv",
}

ENERGIE_SOURCE = "https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/pic-journalier-consommation-brute/exports/csv?use_labels=true"


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


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target in ("geo", "all"):
        run_geo()
    if target in ("elections", "all"):
        run_elections()
    if target in ("energie", "all"):
        run_energie()
    print("Done.")
