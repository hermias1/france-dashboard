import pandas as pd


def parse_energie(df: pd.DataFrame) -> pd.DataFrame:
    return df.rename(columns={
        "Date": "date",
        "Pic journalier consommation (MW)": "pic_consommation_mw",
        "Température moyenne (°C)": "temperature_moyenne",
        "Température référence (°C)": "temperature_reference",
    })[["date", "pic_consommation_mw", "temperature_moyenne", "temperature_reference"]].dropna()
