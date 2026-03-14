import pytest


@pytest.mark.asyncio
async def test_resultats_requires_params(client):
    resp = await client.get("/api/elections/resultats")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_resultats_invalid_niveau(client):
    resp = await client.get("/api/elections/resultats?scrutin=test&niveau=invalid")
    assert resp.status_code == 422
