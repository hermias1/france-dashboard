import pandas as pd


def parse_mix_energetique(df: pd.DataFrame) -> pd.DataFrame:
    """Aggregate 15-min eco2mix data to daily averages."""
    df["date"] = pd.to_datetime(df["Date"], errors="coerce").dt.date

    cols_map = {
        "Consommation (MW)": "consommation_mw",
        "Nucléaire (MW)": "nucleaire_mw",
        "Eolien (MW)": "eolien_mw",
        "Solaire (MW)": "solaire_mw",
        "Hydraulique (MW)": "hydraulique_mw",
        "Gaz (MW)": "gaz_mw",
        "Bioénergies (MW)": "bioenergies_mw",
        "Fioul (MW)": "fioul_mw",
        "Ech. physiques (MW)": "echanges_mw",
        "Taux de CO2 (g/kWh)": "taux_co2",
    }

    for old, new in cols_map.items():
        if old in df.columns:
            df[new] = pd.to_numeric(df[old], errors="coerce")

    agg = df.groupby("date").agg(
        consommation_mw=("consommation_mw", "mean"),
        nucleaire_mw=("nucleaire_mw", "mean"),
        eolien_mw=("eolien_mw", "mean"),
        solaire_mw=("solaire_mw", "mean"),
        hydraulique_mw=("hydraulique_mw", "mean"),
        gaz_mw=("gaz_mw", "mean"),
        bioenergies_mw=("bioenergies_mw", "mean"),
        fioul_mw=("fioul_mw", "mean"),
        echanges_mw=("echanges_mw", "mean"),
        taux_co2=("taux_co2", "mean"),
    ).reset_index()

    for col in ["consommation_mw", "nucleaire_mw", "eolien_mw", "solaire_mw",
                "hydraulique_mw", "gaz_mw", "bioenergies_mw", "fioul_mw", "echanges_mw"]:
        agg[col] = agg[col].round(0).fillna(0).astype(int)
    agg["taux_co2"] = agg["taux_co2"].round(1)

    return agg
