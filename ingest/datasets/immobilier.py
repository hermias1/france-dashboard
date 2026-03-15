import pandas as pd


def parse_immobilier_communes(df: pd.DataFrame) -> pd.DataFrame:
    # Normalize column names (handle different casing between years)
    col_map = {}
    for c in df.columns:
        cl = c.lower().strip()
        if cl == 'insee_com': col_map[c] = 'code_commune'
        elif cl in ('annee', 'année'): col_map[c] = 'annee'
        elif cl == 'nb_mutations': col_map[c] = 'nb_mutations'
        elif cl == 'nbmaisons': col_map[c] = 'nb_maisons'
        elif cl == 'nbapparts': col_map[c] = 'nb_apparts'
        elif cl in ('propmaison',): col_map[c] = 'prop_maison'
        elif cl in ('propappart',): col_map[c] = 'prop_appart'
        elif cl == 'prixmoyen': col_map[c] = 'prix_moyen'
        elif cl == 'prixm2moyen': col_map[c] = 'prix_m2_moyen'
        elif cl == 'surfacemoy': col_map[c] = 'surface_moyenne'

    df = df.rename(columns=col_map)

    needed = ["code_commune", "annee", "nb_mutations", "nb_maisons", "nb_apparts",
              "prix_moyen", "prix_m2_moyen", "surface_moyenne"]

    # Some old files may not have nb_mutations (use Nb_mutations casing)
    for col in needed:
        if col not in df.columns:
            df[col] = 0

    result = df[needed].copy()
    result["code_commune"] = result["code_commune"].astype(str).str.zfill(5)
    result = result.dropna(subset=["prix_moyen"])
    for col in ["nb_mutations", "nb_maisons", "nb_apparts", "prix_moyen", "prix_m2_moyen", "surface_moyenne"]:
        result[col] = pd.to_numeric(result[col], errors="coerce").fillna(0).astype(int)
    result["annee"] = pd.to_numeric(result["annee"], errors="coerce").fillna(0).astype(int)
    result = result[result["annee"] > 0]
    return result
