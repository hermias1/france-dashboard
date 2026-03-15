import pandas as pd


def parse_brevet(df: pd.DataFrame) -> pd.DataFrame:
    df = df.rename(columns={
        "Session": "session",
        "Code département": "code_departement",
        "Libellé département": "nom_departement",
        "Inscrits": "inscrits",
        "Presents": "presents",
        "Admis": "admis",
        "Taux de réussite": "taux_reussite_raw",
    })
    # Keep only latest session
    df["session"] = pd.to_numeric(df["session"], errors="coerce")
    df = df.dropna(subset=["session"])
    df["session"] = df["session"].astype(int)
    latest = df["session"].max()
    df = df[df["session"] == latest].copy()

    df["code_departement"] = df["code_departement"].astype(str).str.zfill(2)

    # Parse taux_reussite: "78,30%" → 78.3
    df["taux_reussite"] = (
        df["taux_reussite_raw"]
        .astype(str)
        .str.replace("%", "")
        .str.replace(",", ".")
        .apply(pd.to_numeric, errors="coerce")
    )

    df["inscrits"] = pd.to_numeric(df["inscrits"], errors="coerce").fillna(0).astype(int)
    df["presents"] = pd.to_numeric(df["presents"], errors="coerce").fillna(0).astype(int)
    df["admis"] = pd.to_numeric(df["admis"], errors="coerce").fillna(0).astype(int)

    grouped = df.groupby(["session", "code_departement", "nom_departement"]).agg(
        nb_etablissements=("code_departement", "size"),
        inscrits=("inscrits", "sum"),
        presents=("presents", "sum"),
        admis=("admis", "sum"),
        taux_reussite=("taux_reussite", "mean"),
    ).reset_index()

    grouped["taux_reussite"] = grouped["taux_reussite"].round(2)
    return grouped[["session", "code_departement", "nom_departement",
                     "nb_etablissements", "inscrits", "presents", "admis", "taux_reussite"]]
