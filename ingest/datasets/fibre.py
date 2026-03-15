import pandas as pd


def parse_fibre(df: pd.DataFrame) -> pd.DataFrame:
    result = pd.DataFrame()
    result["code_commune"] = df["insee_com"].astype(str).str.zfill(5)
    result["nom_commune"] = df["com_lib"]
    result["code_departement"] = df["insee_dep"].astype(str).str.zfill(2)
    result["locaux_total"] = pd.to_numeric(df["locaux_arcep"], errors="coerce").fillna(0).astype(int)
    result["locaux_ftth"] = pd.to_numeric(df["locaux_ftth"], errors="coerce").fillna(0).astype(int)
    # Aggregate by commune (multiple operators per commune)
    result = result.groupby(["code_commune", "nom_commune", "code_departement"]).agg(
        locaux_total=("locaux_total", "sum"),
        locaux_ftth=("locaux_ftth", "sum"),
    ).reset_index()
    result["taux_couverture"] = result.apply(
        lambda r: round(r["locaux_ftth"] / r["locaux_total"] * 100, 2) if r["locaux_total"] > 0 else 0.0,
        axis=1,
    )
    return result
