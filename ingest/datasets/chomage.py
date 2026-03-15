import pandas as pd


def parse_chomage(df: pd.DataFrame) -> pd.DataFrame:
    # Filter for aggregate rows only
    df = df[
        (df["Sexe"].isin(["Ensemble", "Total"]))
        & (df["Tranche d'âge"].isin(["Ensemble", "Total"]))
        & (df["Ancienneté"].isin(["Ensemble", "Total"]))
        & (df["Catégorie"] == "ABC")
    ].copy()

    # Keep only stock data (effectif en fin de période)
    type_col = "Type de données"
    if type_col in df.columns:
        mask = df[type_col].str.contains("ffectif", case=False, na=False)
        if mask.any():
            df = df[mask]

    # Drop rows without real département code (filter out "Total" and blanks)
    df = df.dropna(subset=["Code département"])
    df["Code département"] = df["Code département"].astype(str).str.strip()
    df = df[~df["Code département"].isin(["", "Total", "nan"])]
    df = df[df["Code département"].str.len() <= 3]

    # Build result
    result = pd.DataFrame()
    result["date"] = df["Date"].astype(str).str.strip()
    result["code_departement"] = df["Code département"].astype(str).str.strip().str.zfill(2)
    result["nom_departement"] = df["Département"].astype(str).str.strip()
    result["categorie"] = df["Catégorie"].astype(str).str.strip()

    # The value column — find it (last column or named column)
    value_candidates = [c for c in df.columns if c not in [
        "Date", "Code région", "Région", "Code département", "Département",
        "Type de données", "Catégorie", "Sexe", "Tranche d'âge", "Ancienneté"
    ]]
    if value_candidates:
        val_col = value_candidates[0]
    else:
        val_col = df.columns[-1]

    result["nombre"] = pd.to_numeric(df[val_col], errors="coerce")
    result = result.dropna(subset=["nombre"])
    result["nombre"] = result["nombre"].astype(int)

    return result[["date", "code_departement", "nom_departement", "categorie", "nombre"]]
