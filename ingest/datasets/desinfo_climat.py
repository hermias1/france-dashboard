import pandas as pd


def _fr_numeric(series):
    """Convert French-formatted numbers (comma decimal) to float."""
    return pd.to_numeric(
        series.astype(str).str.replace(",", ".").str.strip(),
        errors="coerce"
    )


def parse_desinfo_climat(df: pd.DataFrame) -> pd.DataFrame:
    # Clean BOM from column names
    df.columns = [c.replace("\ufeff", "").strip() for c in df.columns]

    result = pd.DataFrame()
    result["media"] = df["channel_title"].astype(str).str.strip()

    for src, dst in [("public", "is_public"), ("info_continu", "is_info_continu"), ("radio", "is_radio")]:
        col = df[src].astype(str).str.strip().str.lower()
        result[dst] = col.isin(["true", "1", "oui", "yes"])

    cov_cols = [c for c in df.columns if "coverage" in c.lower()]
    result["couverture_climat"] = _fr_numeric(df[cov_cols[0]]) if cov_cols else None

    result["cas_desinfo"] = _fr_numeric(df["misinfo_cases"]).astype("Int64")

    hour_cols = [c for c in df.columns if "per_hour_dedicated" in c.lower()]
    if not hour_cols:
        hour_cols = [c for c in df.columns if "per_hour" in c.lower()]
    result["desinfo_par_heure"] = _fr_numeric(df[hour_cols[0]]) if hour_cols else None

    return result
