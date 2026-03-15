import pandas as pd


def parse_french_int(val):
    """Parse French-formatted integer: '24 810 ' → 24810."""
    if pd.isna(val):
        return None
    s = str(val).replace("\u202f", "").replace("\xa0", "").replace("\x80", "").replace("€", "").replace(" ", "").strip()
    # Keep only digits
    digits = ''.join(c for c in s if c.isdigit())
    if not digits:
        return None
    return int(digits)


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


def _find_col(df, keyword):
    """Find column containing keyword (case-insensitive)."""
    for c in df.columns:
        if keyword.lower() in c.lower():
            return c
    return None


def parse_precarite(df: pd.DataFrame) -> pd.DataFrame:
    # Filter for departments only
    col_niveau = _find_col(df, "niveau") or df.columns[1]
    df = df[df[col_niveau].astype(str).str.lower().str.contains("partement")].copy()

    # Extract code_departement from ID: "D1" → "01", "D2A" → "2A"
    raw_code = df["ID"].astype(str).str[1:]
    df["code_departement"] = raw_code.apply(lambda c: c.zfill(2) if len(c) <= 2 else c)

    result = pd.DataFrame()
    result["code_departement"] = df["code_departement"].values
    result["nom_departement"] = df["NOM"].astype(str).str.strip().values

    col = _find_col(df, "revenu m")
    result["revenu_median"] = df[col].apply(parse_french_int).values if col else None

    col = _find_col(df, "pauvret")
    result["taux_pauvrete"] = df[col].apply(parse_french_pct).values if col else None

    col = _find_col(df, "rsa")
    result["taux_rsa"] = df[col].apply(parse_french_pct).values if col else None

    col = _find_col(df, "15-24")
    result["taux_chomage_jeunes"] = df[col].apply(parse_french_pct).values if col else None

    col = _find_col(df, "femmes")
    result["salaire_femmes"] = df[col].apply(parse_french_int).values if col else None

    col = _find_col(df, "hommes")
    result["salaire_hommes"] = df[col].apply(parse_french_int).values if col else None

    return result
