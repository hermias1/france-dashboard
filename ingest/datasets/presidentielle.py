import csv
import io


NUANCE_BY_NAME = {
    "MACRON": "LENS",
    "LE PEN": "LRN",
    "MÉLENCHON": "LFI",
    "ZEMMOUR": "LREC",
    "PÉCRESSE": "LLR",
    "JADOT": "LVEC",
    "ROUSSEL": "LCOM",
    "LASSALLE": "LDVD",
    "DUPONT-AIGNAN": "LDLF",
    "HIDALGO": "LSOC",
    "POUTOU": "LEXG",
    "ARTHAUD": "LEXG",
}


def _fr_float(val):
    if not val:
        return 0.0
    return float(val.replace(",", ".").replace("%", "").strip())


def _fr_int(val):
    if not val:
        return 0
    return int(val.strip())


def parse_presidentielle_raw(text: str, scrutin: str, date: str) -> list[dict]:
    """Parse the wide-format presidential CSV manually (pandas can't handle duplicate column names)."""
    rows = []
    reader = csv.reader(io.StringIO(text), delimiter=";")
    header = next(reader)  # skip header

    # Structure per row: 17 common cols + repeating blocks of 6 (Sexe, Nom, Prénom, Voix, %Ins, %Exp)
    # Common: Code dept, Libellé, Etat, Inscrits, Abstentions, %Abs/Ins, Votants, %Vot/Ins,
    #         Blancs, %Blancs/Ins, %Blancs/Vot, Nuls, %Nuls/Ins, %Nuls/Vot, Exprimés, %Exp/Ins, %Exp/Vot
    COMMON_COLS = 17
    BLOCK_SIZE = 6  # Sexe, Nom, Prénom, Voix, %Voix/Ins, %Voix/Exp

    for fields in reader:
        if len(fields) < COMMON_COLS + BLOCK_SIZE:
            continue

        code_geo = fields[0].strip().zfill(2)
        libelle_geo = fields[1].strip()
        inscrits = _fr_int(fields[3])
        votants = _fr_int(fields[6])
        blancs = _fr_int(fields[8])
        nuls = _fr_int(fields[11])
        exprimes = _fr_int(fields[14])

        # Parse candidate blocks
        idx = COMMON_COLS
        while idx + BLOCK_SIZE <= len(fields):
            nom = fields[idx + 1].strip()
            if not nom:
                idx += BLOCK_SIZE
                continue

            voix = _fr_int(fields[idx + 3])
            pct_exp = _fr_float(fields[idx + 5])

            if voix > 0:
                rows.append({
                    "scrutin": scrutin,
                    "date": date,
                    "niveau": "departement",
                    "code_geo": code_geo,
                    "libelle_geo": libelle_geo,
                    "inscrits": inscrits,
                    "votants": votants,
                    "exprimes": exprimes,
                    "blancs": blancs,
                    "nuls": nuls,
                    "liste": nom,
                    "nuance": NUANCE_BY_NAME.get(nom, "LDIV"),
                    "voix": voix,
                    "pct_voix_exprimes": pct_exp,
                    "sieges": 0,
                })
            idx += BLOCK_SIZE

    return rows
