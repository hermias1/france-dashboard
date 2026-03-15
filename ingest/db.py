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


def upsert_delinquance(conn, df):
    cols = ["code_departement", "annee", "indicateur", "nombre", "taux_pour_mille", "population"]
    values = df[cols].values.tolist()
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO delinquance (code_departement, annee, indicateur, nombre, taux_pour_mille, population)
               VALUES %s
               ON CONFLICT (code_departement, annee, indicateur) DO UPDATE SET
                 nombre = EXCLUDED.nombre,
                 taux_pour_mille = EXCLUDED.taux_pour_mille,
                 population = EXCLUDED.population""",
            values,
        )
    conn.commit()


def upsert_immobilier(conn, df):
    cols = ["code_commune", "annee", "nb_mutations", "nb_maisons", "nb_apparts",
            "prix_moyen", "prix_m2_moyen", "surface_moyenne"]
    values = df[cols].values.tolist()
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO immobilier (code_commune, annee, nb_mutations, nb_maisons, nb_apparts,
                 prix_moyen, prix_m2_moyen, surface_moyenne)
               VALUES %s
               ON CONFLICT (code_commune, annee) DO UPDATE SET
                 nb_mutations = EXCLUDED.nb_mutations,
                 prix_moyen = EXCLUDED.prix_moyen,
                 prix_m2_moyen = EXCLUDED.prix_m2_moyen,
                 surface_moyenne = EXCLUDED.surface_moyenne""",
            values,
        )
    conn.commit()


def upsert_accidents(conn, df):
    cols = ["annee", "code_departement", "nb_accidents", "nb_tues", "nb_blesses"]
    values = df[cols].values.tolist()
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO accidents (annee, code_departement, nb_accidents, nb_tues, nb_blesses)
               VALUES %s
               ON CONFLICT (annee, code_departement) DO UPDATE SET
                 nb_accidents = EXCLUDED.nb_accidents,
                 nb_tues = EXCLUDED.nb_tues,
                 nb_blesses = EXCLUDED.nb_blesses""",
            values,
        )
    conn.commit()


def upsert_fibre(conn, df):
    cols = ["code_commune", "nom_commune", "code_departement", "locaux_total", "locaux_ftth", "taux_couverture"]
    values = df[cols].values.tolist()
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO fibre (code_commune, nom_commune, code_departement, locaux_total, locaux_ftth, taux_couverture)
               VALUES %s
               ON CONFLICT (code_commune) DO UPDATE SET
                 nom_commune = EXCLUDED.nom_commune,
                 code_departement = EXCLUDED.code_departement,
                 locaux_total = EXCLUDED.locaux_total,
                 locaux_ftth = EXCLUDED.locaux_ftth,
                 taux_couverture = EXCLUDED.taux_couverture""",
            values,
        )
    conn.commit()


def upsert_loyers(conn, df):
    cols = ["code_commune", "nom_commune", "code_departement", "loyer_m2_moyen"]
    values = df[cols].values.tolist()
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO loyers (code_commune, nom_commune, code_departement, loyer_m2_moyen)
               VALUES %s
               ON CONFLICT (code_commune) DO UPDATE SET
                 nom_commune = EXCLUDED.nom_commune,
                 code_departement = EXCLUDED.code_departement,
                 loyer_m2_moyen = EXCLUDED.loyer_m2_moyen""",
            values,
        )
    conn.commit()


def upsert_apl_medecins(conn, df):
    cols = ["code_commune", "nom_commune", "code_departement", "apl_medecins_generalistes", "population"]
    values = df[cols].values.tolist()
    with conn.cursor() as cur:
        execute_values(cur,
            """INSERT INTO apl_medecins (code_commune, nom_commune, code_departement, apl_medecins_generalistes, population) VALUES %s
               ON CONFLICT (code_commune) DO UPDATE SET apl_medecins_generalistes = EXCLUDED.apl_medecins_generalistes, population = EXCLUDED.population""",
            values)
    conn.commit()


def upsert_elus(conn, df):
    cols = ["type_mandat", "code_departement", "nom", "prenom", "sexe",
            "date_naissance", "profession", "date_debut_mandat", "circonscription"]
    values = df[cols].values.tolist()
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO elus (type_mandat, code_departement, nom, prenom, sexe,
                 date_naissance, profession, date_debut_mandat, circonscription)
               VALUES %s
               ON CONFLICT (type_mandat, nom, prenom, code_departement) DO UPDATE SET
                 sexe = EXCLUDED.sexe,
                 date_naissance = EXCLUDED.date_naissance,
                 profession = EXCLUDED.profession,
                 date_debut_mandat = EXCLUDED.date_debut_mandat,
                 circonscription = EXCLUDED.circonscription""",
            values,
        )
    conn.commit()


def upsert_chomage(conn, df):
    cols = ["date", "code_departement", "nom_departement", "categorie", "nombre"]
    values = df[cols].values.tolist()
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO chomage (date, code_departement, nom_departement, categorie, nombre)
               VALUES %s
               ON CONFLICT (date, code_departement, categorie) DO UPDATE SET
                 nom_departement = EXCLUDED.nom_departement,
                 nombre = EXCLUDED.nombre""",
            values,
        )
    conn.commit()


def upsert_desinfo_climat(conn, df):
    cols = ["media", "is_public", "is_info_continu", "is_radio", "couverture_climat", "cas_desinfo", "desinfo_par_heure"]
    values = df[cols].values.tolist()
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO desinfo_climat (media, is_public, is_info_continu, is_radio, couverture_climat, cas_desinfo, desinfo_par_heure)
               VALUES %s
               ON CONFLICT (media) DO UPDATE SET
                 is_public = EXCLUDED.is_public,
                 is_info_continu = EXCLUDED.is_info_continu,
                 is_radio = EXCLUDED.is_radio,
                 couverture_climat = EXCLUDED.couverture_climat,
                 cas_desinfo = EXCLUDED.cas_desinfo,
                 desinfo_par_heure = EXCLUDED.desinfo_par_heure""",
            values,
        )
    conn.commit()


def upsert_brevet(conn, df):
    cols = ["session", "code_departement", "nom_departement", "nb_etablissements",
            "inscrits", "presents", "admis", "taux_reussite"]
    values = df[cols].values.tolist()
    with conn.cursor() as cur:
        execute_values(
            cur,
            """INSERT INTO brevet (session, code_departement, nom_departement,
                 nb_etablissements, inscrits, presents, admis, taux_reussite)
               VALUES %s
               ON CONFLICT (session, code_departement) DO UPDATE SET
                 nom_departement = EXCLUDED.nom_departement,
                 nb_etablissements = EXCLUDED.nb_etablissements,
                 inscrits = EXCLUDED.inscrits,
                 presents = EXCLUDED.presents,
                 admis = EXCLUDED.admis,
                 taux_reussite = EXCLUDED.taux_reussite""",
            values,
        )
    conn.commit()
