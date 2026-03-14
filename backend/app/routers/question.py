from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import get_pool
from app.llm import question_to_sql, summarize_results

router = APIRouter(prefix="/api/question", tags=["question"])


class QuestionRequest(BaseModel):
    question: str


class QuestionResponse(BaseModel):
    question: str
    sql: str
    results: list[dict]
    summary: str


@router.post("", response_model=QuestionResponse)
async def ask_question(req: QuestionRequest):
    # Step 1: Generate SQL from question
    try:
        sql = await question_to_sql(req.question)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur LLM: {str(e)}")

    # Step 2: Validate SQL (read-only check)
    sql_upper = sql.upper().strip()
    if not sql_upper.startswith("SELECT"):
        raise HTTPException(status_code=400, detail="Seules les requêtes SELECT sont autorisées")
    for forbidden in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE"]:
        if forbidden in sql_upper.split():
            raise HTTPException(status_code=400, detail=f"Opération interdite: {forbidden}")

    # Step 3: Execute SQL
    pool = await get_pool()
    try:
        rows = await pool.fetch(sql)
        results = [dict(r) for r in rows]
        # Convert non-serializable types
        for row in results:
            for k, v in row.items():
                if hasattr(v, 'isoformat'):
                    row[k] = v.isoformat()
                elif isinstance(v, (bytes, memoryview)):
                    row[k] = str(v)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur SQL: {str(e)}")

    # Step 4: Summarize results
    try:
        summary = await summarize_results(req.question, sql, results)
    except Exception:
        summary = f"{len(results)} résultats trouvés."

    return QuestionResponse(
        question=req.question,
        sql=sql,
        results=results,
        summary=summary,
    )
