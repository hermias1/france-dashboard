import asyncpg
import os

pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(os.environ["DATABASE_URL"])
    return pool


async def close_pool():
    global pool
    if pool:
        await pool.close()
        pool = None
