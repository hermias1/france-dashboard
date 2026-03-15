import io
import pandas as pd


def _detect_separator(text: str) -> str:
    """Detect whether CSV uses tab or semicolon as separator."""
    first_line = text.split('\n')[0]
    tabs = first_line.count('\t')
    semis = first_line.count(';')
    return '\t' if tabs > semis else ';'


def _parse_elus(text: str, type_mandat: str) -> pd.DataFrame:
    sep = _detect_separator(text)
    df = pd.read_csv(io.StringIO(text), sep=sep, dtype=str)

    # Normalise column names (strip whitespace)
    df.columns = [c.strip() for c in df.columns]

    # If header used semicolons but data uses tabs, re-read
    if 'Nom de l\'élu' not in df.columns and 'Nom de l\'élu' not in df.columns:
        other_sep = ';' if sep == '\t' else '\t'
        df = pd.read_csv(io.StringIO(text), sep=other_sep, dtype=str)
        df.columns = [c.strip() for c in df.columns]

    col_map = {}
    for c in df.columns:
        cl = c.lower().strip()
        if 'code du département' in cl or 'code département' in cl:
            col_map['code_departement'] = c
        elif 'nom de l' in cl and 'élu' in cl:
            col_map['nom'] = c
        elif 'prénom de l' in cl and 'élu' in cl:
            col_map['prenom'] = c
        elif cl == 'code sexe':
            col_map['sexe'] = c
        elif 'date de naissance' in cl:
            col_map['date_naissance'] = c
        elif 'catégorie socio-professionnelle' in cl and 'libellé' in cl:
            col_map['profession'] = c
        elif 'date de début du mandat' in cl or 'date de début de mandat' in cl:
            col_map['date_debut_mandat'] = c
        elif 'circonscription' in cl and 'libellé' in cl:
            col_map['circonscription'] = c
        elif 'libellé de la commune' in cl or 'nom de la commune' in cl:
            if 'circonscription' not in col_map:
                col_map['circonscription'] = c

    rows = []
    for _, row in df.iterrows():
        code_dept = str(row.get(col_map.get('code_departement', ''), '')).strip()
        if code_dept and code_dept != 'nan':
            code_dept = code_dept.zfill(2) if len(code_dept) < 2 else code_dept
        else:
            code_dept = None

        date_naissance = _parse_date(row.get(col_map.get('date_naissance', ''), ''))
        date_debut = _parse_date(row.get(col_map.get('date_debut_mandat', ''), ''))

        sexe_raw = str(row.get(col_map.get('sexe', ''), '')).strip()
        sexe = sexe_raw if sexe_raw in ('M', 'F') else None

        nom = str(row.get(col_map.get('nom', ''), '')).strip()
        prenom = str(row.get(col_map.get('prenom', ''), '')).strip()
        if not nom or nom == 'nan':
            continue

        profession = str(row.get(col_map.get('profession', ''), '')).strip()
        if profession == 'nan':
            profession = None

        circonscription = str(row.get(col_map.get('circonscription', ''), '')).strip()
        if circonscription == 'nan':
            circonscription = None

        rows.append({
            'type_mandat': type_mandat,
            'code_departement': code_dept,
            'nom': nom[:100],
            'prenom': prenom[:100],
            'sexe': sexe,
            'date_naissance': date_naissance,
            'profession': profession[:200] if profession else None,
            'date_debut_mandat': date_debut,
            'circonscription': circonscription[:200] if circonscription else None,
        })

    return pd.DataFrame(rows)


def _parse_date(val):
    """Parse DD/MM/YYYY date string to YYYY-MM-DD."""
    s = str(val).strip()
    if not s or s == 'nan' or s == 'NaT':
        return None
    for fmt in ('%d/%m/%Y', '%Y-%m-%d'):
        try:
            from datetime import datetime
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None


def parse_deputes(text: str) -> pd.DataFrame:
    return _parse_elus(text, 'depute')


def parse_senateurs(text: str) -> pd.DataFrame:
    return _parse_elus(text, 'senateur')


def parse_maires(text: str) -> pd.DataFrame:
    return _parse_elus(text, 'maire')
