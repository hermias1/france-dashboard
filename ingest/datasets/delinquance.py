import pandas as pd


def parse_delinquance_departement(df: pd.DataFrame) -> pd.DataFrame:
    result = df.rename(columns={
        "Code_departement": "code_departement",
        "annee": "annee",
        "indicateur": "indicateur",
        "nombre": "nombre",
        "taux_pour_mille": "taux_pour_mille",
        "insee_pop": "population",
    })[["code_departement", "annee", "indicateur", "nombre", "taux_pour_mille", "population"]]
    result["code_departement"] = result["code_departement"].astype(str).str.zfill(2)
    result = result.dropna(subset=["nombre"])
    result["nombre"] = result["nombre"].astype(int)
    result["annee"] = result["annee"].astype(int)
    result["population"] = result["population"].fillna(0).astype(int)
    # French CSV uses comma as decimal separator
    result["taux_pour_mille"] = result["taux_pour_mille"].astype(str).str.replace(",", ".").astype(float)
    return result
