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
