import pandas as pd


def parse_accidents(df: pd.DataFrame) -> pd.DataFrame:
    df["dep"] = df["dep"].astype(str).str.zfill(2)
    grouped = df.groupby("dep").size().reset_index(name="nb_accidents")
    grouped = grouped.rename(columns={"dep": "code_departement"})
    grouped["annee"] = 2024
    grouped["nb_tues"] = 0
    grouped["nb_blesses"] = 0
    return grouped[["annee", "code_departement", "nb_accidents", "nb_tues", "nb_blesses"]]
