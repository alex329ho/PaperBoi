import asyncio
import json

from services.openrouter_service import OpenRouterService


class AsyncRedisMock:
    def __init__(self):
        self._store = {}

    async def get(self, key):
        return self._store.get(key)

    async def set(self, key, value, ex=None):
        self._store[key] = value
        return True


class MockResponse:
    def __init__(self, status_code: int, text: str):
        self.status_code = status_code
        self.text = text

    async def aiter_text(self):
        # Yield whole body once for streaming path
        yield self.text


class MockHttpClient:
    async def post(self, url, headers=None, json=None, timeout=None):
        resp = {
            "id": "gen-123",
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {"content": "This is a mocked summary.", "role": "assistant"},
                }
            ],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        }
        return MockResponse(200, json.dumps(resp))

    class _StreamCtx:
        def __init__(self, resp):
            self._resp = resp

        async def __aenter__(self):
            return self._resp

        async def __aexit__(self, exc_type, exc, tb):
            return False

    def stream(self, *args, **kwargs):
        resp = MockResponse(200, json.dumps({
            "id": "gen-123",
            "choices": [
                {"finish_reason": "stop", "message": {"content": "This is a mocked streamed summary.", "role": "assistant"}}
            ],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        }))
        return self._StreamCtx(resp)


async def main():
    redis = AsyncRedisMock()
    mock_http = MockHttpClient()
    service = OpenRouterService(redis_client=redis, api_key="fake-key", http_client=mock_http)

    summary = await service.summarize(
        text="This is some sample article text. It has several sentences. We want a short summary.",
        title="Sample Title",
        length="SHORT",
        article_id="test-1",
        stream=False,
    )
    print("Non-stream summary:", summary)

    # Streaming run (service will aggregate and return final summary)
    summary_stream = await service.summarize(
        text="Streaming path article text. More text here.",
        title="Sample Stream Title",
        length="SHORT",
        article_id="test-stream-1",
        stream=True,
    )
    print("Stream summary:", summary_stream)


if __name__ == "__main__":
    asyncio.run(main())
