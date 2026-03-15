import pandas as pd


def parse_french_int(val):
    """Parse French-formatted integer: '24 810 ' → 24810."""
    if pd.isna(val):
        return None
    s = str(val).replace("\u202f", "").replace("\xa0", "").replace(" ", "").strip()
    if not s:
        return None
    try:
        return int(s)
    except ValueError:
        return None


def parse_french_pct(val):
    """Parse French percentage: '11%' → 11.0."""
    if pd.isna(val):
        return None
    s = str(val).replace("%", "").replace(",", ".").replace("\u202f", "").replace("\xa0", "").replace(" ", "").strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_precarite(df: pd.DataFrame) -> pd.DataFrame:
    # Filter for departments only
    col_niveau = "Niveau géographique"
    df = df[df[col_niveau] == "Département"].copy()

    # Extract code_departement from ID: "D1" → "01", "D2A" → "2A"
    raw_code = df["ID"].astype(str).str[1:]  # strip "D" prefix
    df["code_departement"] = raw_code.apply(lambda c: c.zfill(2) if len(c) <= 2 else c)

    result = pd.DataFrame()
    result["code_departement"] = df["code_departement"].values
    result["nom_departement"] = df["NOM"].astype(str).str.strip().values

    result["revenu_median"] = df["Revenu médian (Insee FiLoSoFi 2021)"].apply(parse_french_int).values
    result["taux_pauvrete"] = df["Taux de pauvreté au seuil de 60% (Insee FiLoSoFi 2021)"].apply(parse_french_pct).values
    result["taux_rsa"] = df["Part des allocataires du RSA (CAF 2024) parmi les ménages (Insee 2022)"].apply(parse_french_pct).values
    result["taux_chomage_jeunes"] = df["Part des 15-24 ans actifs au chômage (Insee 2022)"].apply(parse_french_pct).values
    result["salaire_femmes"] = df["Salaire mensuel net des femmes salariées en EQTP (Insee DADS 2023)"].apply(parse_french_int).values
    result["salaire_hommes"] = df["Salaire mensuel net des hommes salariés en EQTP (Insee DADS 2023)"].apply(parse_french_int).values

    return result
