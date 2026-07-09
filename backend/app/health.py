"""
health.py — canonical liveness + readiness for FastAPI on Kubernetes.

Usage in main.py:
    from app.health import router as health_router, register_check
    app.include_router(health_router, prefix="/api")
"""
from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable, Dict, Union

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])

CheckFn = Callable[[], Union[None, Awaitable[None]]]

_CHECKS: Dict[str, CheckFn] = {}

_PER_CHECK_TIMEOUT = 1.5
_GLOBAL_TIMEOUT = 2.5


def register_check(name: str, fn: CheckFn) -> None:
    """Register a readiness check. Idempotent — later calls overwrite."""
    _CHECKS[name] = fn


def clear_checks() -> None:
    """Test helper — reset registry."""
    _CHECKS.clear()


# ---------- Liveness ----------

@router.get("/health", include_in_schema=False)
async def health() -> dict:
    """Liveness probe. 200 as long as the process is alive. No dep checks."""
    return {"status": "ok"}


# ---------- Readiness ----------

async def _run_one(name: str, fn: CheckFn) -> tuple[str, dict]:
    try:
        result = fn()
        if asyncio.iscoroutine(result):
            await asyncio.wait_for(result, timeout=_PER_CHECK_TIMEOUT)
        else:
            await asyncio.wait_for(
                run_in_threadpool(lambda: None if result is None else result),
                timeout=_PER_CHECK_TIMEOUT,
            )
        return name, {"ok": True}
    except asyncio.TimeoutError:
        return name, {"ok": False, "error": f"timeout>{_PER_CHECK_TIMEOUT}s"}
    except Exception as exc:  # noqa: BLE001
        return name, {"ok": False, "error": f"{type(exc).__name__}: {exc}"[:200]}


@router.get("/ready", include_in_schema=False)
async def ready() -> JSONResponse:
    """Readiness probe. 200 if every dep responds within budget, else 503."""
    if not _CHECKS:
        return JSONResponse({"status": "ready", "checks": {}}, status_code=200)

    try:
        results = await asyncio.wait_for(
            asyncio.gather(*(_run_one(name, fn) for name, fn in _CHECKS.items())),
            timeout=_GLOBAL_TIMEOUT,
        )
        checks = dict(results)
    except asyncio.TimeoutError:
        checks = {name: {"ok": False, "error": "global timeout"} for name in _CHECKS}
    except Exception as exc:  # noqa: BLE001
        logger.exception("readiness probe crashed")
        return JSONResponse(
            {"status": "not_ready", "error": f"{type(exc).__name__}: {exc}"[:200]},
            status_code=503,
        )

    all_ok = all(c["ok"] for c in checks.values())
    return JSONResponse(
        {"status": "ready" if all_ok else "not_ready", "checks": checks},
        status_code=200 if all_ok else 503,
    )


# ---------- Ready-made check factories ----------

def check_asyncpg_lazy(get_pool: Callable[[], Awaitable]) -> CheckFn:
    """asyncpg pool behind a lazy async getter (like this app's get_pool())."""
    async def _wrapped() -> None:
        pool = await get_pool()
        row = await pool.fetchval("SELECT 1")
        if row != 1:
            raise RuntimeError(f"SELECT 1 returned {row!r}")

    return _wrapped
