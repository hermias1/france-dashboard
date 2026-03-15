import csv
import io


def _fr_float(val):
    if not val:
        return 0.0
    return float(val.replace(",", ".").replace("%", "").strip())


def _fr_int(val):
    if not val:
        return 0
    # Remove any % or spaces
    val = val.replace("%", "").replace(" ", "").strip()
    if not val:
        return 0
    return int(float(val))


def parse_legislatives_raw(text: str, scrutin: str, date: str) -> list[dict]:
    """Parse législatives par département CSV.

    Structure: 16 common cols + repeating blocks of 4 (Nuance, Voix, %Ins, %Exp)
    Common: Code dept[0], Libellé[1], Inscrits[2], Votants[3], %Votants[4],
            Abstentions[5], %Abst[6], Exprimés[7], %Exp/ins[8], %Exp/vot[9],
            Blancs[10], %Blancs/ins[11], %Blancs/vot[12], Nuls[13], %Nuls/ins[14], %Nuls/vot[15]
    Block (4): Nuance candidat N, Voix N, %Voix/inscrits N, %Voix/exprimés N
    """
    rows = []
    reader = csv.reader(io.StringIO(text), delimiter=";")
    header = next(reader)

    COMMON_COLS = 16
    BLOCK_SIZE = 4

    for fields in reader:
        if len(fields) < COMMON_COLS + BLOCK_SIZE:
            continue

        code_geo = fields[0].strip().zfill(2)
        libelle_geo = fields[1].strip()
        inscrits = _fr_int(fields[2])
        votants = _fr_int(fields[3])
        exprimes = _fr_int(fields[7])
        blancs = _fr_int(fields[10])
        nuls = _fr_int(fields[13])

        idx = COMMON_COLS
        while idx + BLOCK_SIZE <= len(fields):
            nuance = fields[idx].strip()
            if not nuance:
                idx += BLOCK_SIZE
                continue

            voix = _fr_int(fields[idx + 1])
            pct_exp = _fr_float(fields[idx + 3])

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
                    "liste": nuance,  # Use nuance as liste name
                    "nuance": nuance,
                    "voix": voix,
                    "pct_voix_exprimes": pct_exp,
                    "sieges": 0,
                })
            idx += BLOCK_SIZE

    return rows
