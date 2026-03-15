import pandas as pd


def parse_apl_medecins(df: pd.DataFrame) -> pd.DataFrame:
    """Parse APL XLSX data (already loaded with skiprows=9)."""
    result = pd.DataFrame()
    result["code_commune"] = df["Code commune INSEE"].astype(str).str.replace(".0", "").str.zfill(5)
    result["nom_commune"] = df["Commune"]
    result["code_departement"] = result["code_commune"].str[:2]
    result["apl_medecins_generalistes"] = pd.to_numeric(df["APL aux médecins généralistes"], errors="coerce")
    result["population"] = pd.to_numeric(df["Population totale 2021"], errors="coerce").fillna(0).astype(int)
    result = result.dropna(subset=["apl_medecins_generalistes"])
    result = result[result["code_commune"].str.len() == 5]
    return result
