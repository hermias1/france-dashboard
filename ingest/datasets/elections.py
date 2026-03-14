import re
import pandas as pd


def parse_elections_by_region(df: pd.DataFrame, scrutin: str, date: str) -> list[dict]:
    return _parse_elections(df, scrutin, date, niveau="region", code_col="Code région", libelle_col="Libellé région")


def parse_elections_by_departement(df: pd.DataFrame, scrutin: str, date: str) -> list[dict]:
    return _parse_elections(df, scrutin, date, niveau="departement", code_col="Code département", libelle_col="Libellé département")


def _parse_elections(df, scrutin, date, niveau, code_col, libelle_col):
    rows = []
    list_nums = sorted(set(
        int(m.group(1))
        for col in df.columns
        if (m := re.match(r"Voix (\d+)", col))
    ))

    for _, row in df.iterrows():
        for n in list_nums:
            voix_col = f"Voix {n}"
            if voix_col not in df.columns or pd.isna(row.get(voix_col)):
                continue
            voix = int(row[voix_col]) if not pd.isna(row.get(voix_col)) else 0
            if voix == 0:
                continue

            pct_col = f"% Voix/exprimés {n}"
            pct = row.get(pct_col, 0)
            if isinstance(pct, str):
                pct = float(pct.replace("%", "").replace(",", "."))

            sieges_col = f"Sièges {n}"
            sieges = row.get(sieges_col, 0)
            if isinstance(sieges, bool):
                sieges = 0
            sieges = int(sieges) if not pd.isna(sieges) else 0

            rows.append({
                "scrutin": scrutin,
                "date": date,
                "niveau": niveau,
                "code_geo": str(row[code_col]).zfill(2),
                "libelle_geo": row[libelle_col],
                "inscrits": int(row["Inscrits"]),
                "votants": int(row["Votants"]),
                "exprimes": int(row["Exprimés"]),
                "blancs": int(row["Blancs"]),
                "nuls": int(row["Nuls"]),
                "liste": row.get(f"Libellé abrégé de liste {n}", ""),
                "nuance": row.get(f"Nuance liste {n}", ""),
                "voix": voix,
                "pct_voix_exprimes": float(pct) if pct else 0,
                "sieges": sieges,
            })
    return rows
