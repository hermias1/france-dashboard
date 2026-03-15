import pandas as pd


def parse_loyers(df: pd.DataFrame) -> pd.DataFrame:
    result = pd.DataFrame()
    result["code_commune"] = df["INSEE_C"].astype(str).str.zfill(5)
    result["nom_commune"] = df["LIBGEO"]
    result["code_departement"] = df["DEP"].astype(str).str.zfill(2)
    result["loyer_m2_moyen"] = df["loypredm2"].astype(str).str.replace(",", ".").astype(float)
    return result
