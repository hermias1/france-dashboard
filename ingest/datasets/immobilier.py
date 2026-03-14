import pandas as pd


def parse_immobilier_communes(df: pd.DataFrame) -> pd.DataFrame:
    result = df.rename(columns={
        "INSEE_COM": "code_commune",
        "annee": "annee",
        "nb_mutations": "nb_mutations",
        "NbMaisons": "nb_maisons",
        "NbApparts": "nb_apparts",
        "PrixMoyen": "prix_moyen",
        "Prixm2Moyen": "prix_m2_moyen",
        "SurfaceMoy": "surface_moyenne",
    })[["code_commune", "annee", "nb_mutations", "nb_maisons", "nb_apparts",
        "prix_moyen", "prix_m2_moyen", "surface_moyenne"]]
    result["code_commune"] = result["code_commune"].astype(str).str.zfill(5)
    result = result.dropna(subset=["prix_moyen"])
    for col in ["nb_mutations", "nb_maisons", "nb_apparts", "prix_moyen", "prix_m2_moyen", "surface_moyenne"]:
        result[col] = result[col].fillna(0).astype(int)
    result["annee"] = result["annee"].astype(int)
    return result
