import pandas as pd


def parse_desinfo_climat(df: pd.DataFrame) -> pd.DataFrame:
    result = pd.DataFrame()
    result["media"] = df["channel_title"].astype(str).str.strip()

    # Boolean columns — handle various formats (True/False, 1/0, oui/non)
    for src, dst in [("public", "is_public"), ("info_continu", "is_info_continu"), ("radio", "is_radio")]:
        col = df[src].astype(str).str.strip().str.lower()
        result[dst] = col.isin(["true", "1", "oui", "yes"])

    # Find the coverage column (contains "coverage" in name)
    cov_cols = [c for c in df.columns if "coverage" in c.lower()]
    if cov_cols:
        result["couverture_climat"] = pd.to_numeric(df[cov_cols[0]], errors="coerce")
    else:
        result["couverture_climat"] = None

    result["cas_desinfo"] = pd.to_numeric(df["misinfo_cases"], errors="coerce").astype("Int64")

    # misinfo_per_hour_monitored
    hour_cols = [c for c in df.columns if "per_hour_monitored" in c.lower()]
    if hour_cols:
        result["desinfo_par_heure"] = pd.to_numeric(df[hour_cols[0]], errors="coerce")
    else:
        result["desinfo_par_heure"] = None

    return result
