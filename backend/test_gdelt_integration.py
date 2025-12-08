# backend/test_gdelt_integration.py
import asyncio
import json
from typing import Optional, Dict, Any

from backend.services.gdelt_service import GDELTService

class AsyncRedisStub:
    def __init__(self):
        self._store: Dict[str, Any] = {}
        self._sets: Dict[str, set] = {}
        self._counters: Dict[str, int] = {}

    async def get(self, key: str) -> Optional[str]:
        return self._store.get(key)

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> None:
        self._store[key] = value

    async def incr(self, key: str) -> int:
        self._counters[key] = self._counters.get(key, 0) + 1
        return self._counters[key]

    async def expire(self, key: str, seconds: int) -> None:
        return None

    async def sismember(self, name: str, member: str) -> bool:
        return member in self._sets.get(name, set())

    async def sadd(self, name: str, *values: str) -> None:
        s = self._sets.setdefault(name, set())
        s.update(values)

async def debug_fetch():
    redis_stub = AsyncRedisStub()
    svc = GDELTService(db_session=None, redis_client=redis_stub)

    params = svc._build_query_params("technology", timespan="8hours", region="US", language="en")
    print("Request params:", params)

    try:
        resp = await asyncio.to_thread(svc.http.get, svc.BASE_URL, params=params, timeout=svc.request_timeout)
        print("HTTP status:", resp.status_code)
        text_preview = (resp.text or "")[:2000]
        print("Raw response (first 2k chars):\n", text_preview)
        try:
            data = resp.json()
            if isinstance(data, dict):
                print("Top-level keys:", list(data.keys()))
            else:
                print("Top-level type:", type(data))
            sample = json.dumps(data, indent=2)[:2000]
            print("JSON sample (first 2k chars):\n", sample)
        except Exception as e:
            print("Failed to decode JSON:", e)
    except Exception as e:
        print("HTTP request failed:", e)

    # Try service parsing to get the exact exception and full traceback
    try:
        parsed = await svc._fetch_and_parse(params)
        print("Parsed articles count:", len(parsed))
    except Exception as e:
        import traceback
        print("Parse error:", type(e), e)
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_fetch())