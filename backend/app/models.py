from pydantic import BaseModel


class ElectionResult(BaseModel):
    code_geo: str
    libelle_geo: str
    liste: str
    nuance: str
    voix: int
    pct_voix_exprimes: float
    sieges: int


class ParticipationResult(BaseModel):
    code_geo: str
    libelle_geo: str
    inscrits: int
    votants: int
    exprimes: int
    blancs: int
    nuls: int
    taux_participation: float


class EnergiePoint(BaseModel):
    date: str
    pic_consommation_mw: int | None = None
    temperature_moyenne: float | None = None
    temperature_reference: float | None = None


class GeoRegion(BaseModel):
    code: str
    nom: str


class GeoDepartement(BaseModel):
    code: str
    nom: str
    region_code: str
