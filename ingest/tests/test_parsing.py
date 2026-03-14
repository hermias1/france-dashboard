import io
import pandas as pd
from datasets.geo import parse_regions, parse_departements
from datasets.elections import parse_elections_by_region


def test_parse_regions():
    csv_data = "REG,LIBELLE\n84,Auvergne-Rhône-Alpes\n27,Bourgogne-Franche-Comté"
    df = parse_regions(pd.read_csv(io.StringIO(csv_data)))
    assert len(df) == 2
    assert list(df.columns) == ["code", "nom"]
    assert df.iloc[0]["code"] == "84"
    assert df.iloc[0]["nom"] == "Auvergne-Rhône-Alpes"


def test_parse_departements():
    csv_data = "DEP,LIBELLE,REG\n01,Ain,84\n02,Aisne,32"
    df = parse_departements(pd.read_csv(io.StringIO(csv_data)))
    assert len(df) == 2
    assert list(df.columns) == ["code", "nom", "region_code"]
    assert df.iloc[0]["region_code"] == "84"


def test_parse_elections_region():
    csv_data = (
        "Code région;Libellé région;Inscrits;Votants;% Votants;"
        "Exprimés;Blancs;Nuls;"
        "Numéro de panneau 1;Nuance liste 1;Libellé abrégé de liste 1;"
        "Voix 1;% Voix/exprimés 1;Sièges 1\n"
        "84;Auvergne-Rhône-Alpes;5000000;2600000;52,00%;"
        "2500000;60000;40000;"
        "1;LRN;RN;800000;32,00%;30\n"
    )
    rows = parse_elections_by_region(
        pd.read_csv(io.StringIO(csv_data), sep=";"),
        scrutin="europeennes-2024",
        date="2024-06-09",
    )
    assert len(rows) == 1
    assert rows[0]["code_geo"] == "84"
    assert rows[0]["liste"] == "RN"
    assert rows[0]["voix"] == 800000
    assert rows[0]["niveau"] == "region"
