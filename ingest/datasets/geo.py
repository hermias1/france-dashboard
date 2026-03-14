import pandas as pd


def parse_regions(df: pd.DataFrame) -> pd.DataFrame:
    result = df.rename(columns={"REG": "code", "LIBELLE": "nom"})[["code", "nom"]]
    result["code"] = result["code"].astype(str).str.zfill(2)
    return result


def parse_departements(df: pd.DataFrame) -> pd.DataFrame:
    result = df.rename(columns={
        "DEP": "code",
        "LIBELLE": "nom",
        "REG": "region_code",
    })[["code", "nom", "region_code"]]
    result["code"] = result["code"].astype(str).str.zfill(2)
    result["region_code"] = result["region_code"].astype(str).str.zfill(2)
    return result
