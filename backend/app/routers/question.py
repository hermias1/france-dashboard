from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import get_pool
from app.llm import run_agent

router = APIRouter(prefix="/api/question", tags=["question"])


class QuestionRequest(BaseModel):
    question: str


class AgentStep(BaseModel):
    sql: str
    results: list[dict] | None = None
    error: str | None = None


class ChartSpec(BaseModel):
    chart_type: str
    title: str
    data: list[dict]
    x_key: str
    y_keys: list[str]
    colors: list[str] | None = None
    x_label: str | None = None
    y_label: str | None = None


class QuestionResponse(BaseModel):
    question: str
    steps: list[AgentStep]
    answer: str
    chart: ChartSpec | None = None


async def execute_sql(sql: str) -> list[dict]:
    """Execute SQL with safety checks. Used as tool by the agent."""
    sql_upper = sql.upper().strip()
    if not (sql_upper.startswith("SELECT") or sql_upper.startswith("WITH")):
        raise ValueError("Seules les requêtes SELECT sont autorisées")
    for forbidden in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE"]:
        if forbidden in sql_upper.split():
            raise ValueError(f"Opération interdite: {forbidden}")

    pool = await get_pool()
    rows = await pool.fetch(sql)
    results = []
    for r in rows:
        row = dict(r)
        for k, v in row.items():
            if hasattr(v, 'isoformat'):
                row[k] = v.isoformat()
            elif isinstance(v, (bytes, memoryview)):
                row[k] = str(v)
        results.append(row)
    return results


@router.post("", response_model=QuestionResponse)
async def ask_question(req: QuestionRequest):
    try:
        result = await run_agent(req.question, execute_sql)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur agent: {str(e)}")

    chart = None
    if result.get("chart"):
        chart = ChartSpec(**result["chart"])

    return QuestionResponse(
        question=result["question"],
        steps=[AgentStep(**s) for s in result["steps"]],
        answer=result["answer"],
        chart=chart,
    )
