import asyncio

import fakeredis.aioredis
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.schema import CreateTable
from sqlalchemy.pool import StaticPool
from pathlib import Path
import sys
import os

os.environ.setdefault("PAPERBOI_DATABASE_URL", "sqlite+aiosqlite:///:memory:")

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from main import app
from backend.dependencies import get_db_session, get_redis
from backend.models.database import Base


def setup_app() -> TestClient:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    redis_client = fakeredis.aioredis.FakeRedis()

    async def init_db() -> None:
        async with engine.begin() as conn:
            for table in Base.metadata.sorted_tables:
                await conn.execute(CreateTable(table))

    asyncio.run(init_db())

    async def _get_db_session():
        async with session_factory() as session:
            yield session

    async def _get_redis():
        return redis_client

    app.dependency_overrides[get_db_session] = _get_db_session
    app.dependency_overrides[get_redis] = _get_redis

    client = TestClient(app)
    client.engine = engine  # type: ignore[attr-defined]
    return client


def teardown_app(client: TestClient) -> None:
    app.dependency_overrides = {}
    asyncio.run(client.engine.dispose())  # type: ignore[attr-defined]


def test_register_and_login() -> None:
    client = setup_app()
    try:
        register_resp = client.post(
            "/api/v1/auth/register",
            json={"email": "user@example.com", "password": "SecurePassword123!", "name": "John Doe"},
        )
        assert register_resp.status_code == 201
        tokens_resp = client.post(
            "/api/v1/auth/login",
            json={"email": "user@example.com", "password": "SecurePassword123!"},
        )
        payload = tokens_resp.json()
        assert tokens_resp.status_code == 200
        assert payload["success"] is True
        assert payload["data"]["access_token"]
    finally:
        teardown_app(client)
