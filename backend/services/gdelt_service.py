"""Service for integrating with the GDELT Project API.

Supported filters include keyword queries, time spans, specific date ranges,
regions (``sourcecountry``), and languages. The service performs caching,
deduplication, rate limit tracking, and optional article content retrieval.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests
from bs4 import BeautifulSoup
from redis.asyncio import Redis
from requests import Response
from requests.adapters import HTTPAdapter
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.models.news import NewsArticle
from backend.schemas.gdelt import GdeltResponse
from backend.services.exceptions import (
    GDELTContentFetchError,
    GDELTDatabaseError,
    GDELTInvalidParameterError,
    GDELTNetworkError,
    GDELTRateLimitError,
    GDELTResponseError,
)
from backend.utils.logger import get_logger
from backend.utils.retry_handler import execute_with_retry
from backend.utils.url_utils import hash_url, is_valid_url


class GDELTService:
    """Fetch and persist news articles from the GDELT Project API."""

    DEFAULT_BASE_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
    CACHE_TTL_SECONDS = 3600
    MAX_RETRIES = 5
    REQUEST_TIMEOUT = 30
    MAX_RECORDS = 250
    RATE_LIMIT_PER_DAY = 250
    DEFAULT_RETRY_AFTER_SECONDS = 15
    COOLDOWN_KEY = "gdelt:cooldown"
    CACHE_KEY_PREFIX = "gdelt:cache"
    URL_HASH_SET = "gdelt:url_hashes"
    RATE_LIMIT_KEY = "gdelt:daily_requests"

    def __init__(
        self,
        db_session: AsyncSession,
        redis_client: Redis,
        *,
        request_timeout: int = settings.request_timeout_seconds,
        cache_ttl_seconds: int = CACHE_TTL_SECONDS,
        max_retries: int = MAX_RETRIES,
    ) -> None:
        self.db_session = db_session
        self.redis = redis_client
        self.request_timeout = request_timeout
        self.cache_ttl_seconds = cache_ttl_seconds
        self.max_retries = max_retries
        self.logger = get_logger(__name__)
        self.base_url = settings.gdelt_api_url or self.DEFAULT_BASE_URL

        adapter = HTTPAdapter(pool_connections=20, pool_maxsize=50)
        self.http = requests.Session()
        self.http.mount("http://", adapter)
        self.http.mount("https://", adapter)

    def validate_query_parameters(self, query: str, timespan: Optional[str], region: Optional[str], language: Optional[str]) -> bool:
        """Validate supported GDELT query parameters.

        Parameters
        ----------
        query:
            Search keyword or phrase.
        timespan:
            Relative timespan string such as ``"8hours"`` or ``"1day"``.
        region:
            Two-letter source country code.
        language:
            ISO language code.

        Raises
        ------
        GDELTInvalidParameterError
            If any parameter fails validation.
        """

        if not query or not query.strip():
            raise GDELTInvalidParameterError("Query string cannot be empty")

        if timespan:
            normalized = timespan.strip().lower()
            if not self._is_valid_timespan(normalized):
                raise GDELTInvalidParameterError(
                    "Timespan must be a number plus unit (h, d, w, m, y) or full words like 'hours', 'days', 'weeks', 'months', 'years'"
                )

        if region and len(region) != 2:
            raise GDELTInvalidParameterError("Region must be a two-letter country code")

        if language and not 2 <= len(language) <= 5:
            raise GDELTInvalidParameterError("Language must be a valid ISO code")

        return True

    async def fetch_news(self, query: str, timespan: str = "8hours", region: Optional[str] = None, language: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch news articles using timespan filters."""

        self.validate_query_parameters(query, timespan, region, language)
        params = self._build_query_params(query, timespan=timespan, region=region, language=language)
        return await self._fetch_and_parse(params)

    async def fetch_news_by_date(self, query: str, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """Fetch news articles between explicit datetime boundaries."""

        if start_date >= end_date:
            raise GDELTInvalidParameterError("start_date must be before end_date")

        start = start_date.strftime("%Y%m%d%H%M%S")
        end = end_date.strftime("%Y%m%d%H%M%S")
        params = self._build_query_params(query, start_date=start, end_date=end)
        return await self._fetch_and_parse(params)

    async def _fetch_and_parse(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        cache_key = self._cache_key(params)
        cached = await self.redis.get(cache_key)
        if cached:
            self.logger.info("Cache hit for GDELT query", extra={"params": params})
            cached_articles = json.loads(cached)
            return [self._normalize_article_types(article) for article in cached_articles]

        self.logger.info("Requesting GDELT articles", extra={"params": params})
        response_data = await self._execute_request(params)
        articles = self.parse_gdelt_response(response_data)
        await self.redis.set(cache_key, json.dumps(articles, default=str), ex=self.cache_ttl_seconds)
        return articles

    async def _execute_request(self, params: Dict[str, Any]) -> Dict[str, Any]:
        await self._check_cooldown()
        await self._enforce_rate_limit()

        async def _request() -> Response:
            return await asyncio.to_thread(
                self.http.get,
                self.base_url,
                params=params,
                timeout=self.request_timeout,
            )

        try:
            response = await execute_with_retry(
                _request,
                (requests.Timeout, requests.ConnectionError),
                retries=self.max_retries,
                base_delay=1,
                backoff_factor=2,
                max_delay=30,
                logger=self.logger,
            )
        except requests.RequestException as exc:  # pragma: no cover - safety
            raise GDELTNetworkError("Network failure during GDELT request", details=str(exc)) from exc

        if response.status_code == 429:
            retry_after = self._retry_after_seconds(response)
            await self._set_cooldown(retry_after)
            self.logger.warning(
                "GDELT rate limited; entering cooldown",
                extra={"retry_after": retry_after, "params": params},
            )
            raise GDELTRateLimitError("GDELT API rate limit reached", details=response.text)

        if not response.ok:
            raise GDELTResponseError(
                f"Unexpected GDELT response status: {response.status_code}", details=response.text
            )

        try:
            return response.json()
        except ValueError as exc:
            raise GDELTResponseError("Failed to decode GDELT response as JSON") from exc

    def parse_gdelt_response(self, response: dict) -> List[Dict[str, Any]]:
        """Parse raw GDELT JSON into dictionaries compatible with ``NewsArticle``.

        This parser validates articles one-by-one and skips malformed entries
        instead of failing the entire response.
        """
        raw_articles = response.get("articles", []) if isinstance(response, dict) else []
        parsed: List[Dict[str, Any]] = []
        skipped = 0

        for idx, raw in enumerate(raw_articles):
            try:
                gdelt_article = GdeltResponse.__fields__  # no-op to satisfy linter
                # Validate a single article using the GdeltArticle model
                from backend.schemas.gdelt import GdeltArticle  # local import to avoid cycles
                art = GdeltArticle.model_validate(raw)
            except Exception as exc:
                # Log debug info and skip this article
                self.logger.debug("Skipping malformed GDELT article", extra={"index": idx, "error": str(exc)})
                skipped += 1
                continue

            published_date = art.seen_datetime.date() if art.seen_datetime else None
            parsed.append(
                {
                    "title": art.title or "",
                    "url": str(art.url),
                    "domain": art.domain,
                    "source": art.sourcename or art.domain,
                    "published_date": published_date,
                    "content": None,
                    "tone": f"{art.tone:.2f}" if art.tone is not None else None,
                    "location": art.sourcecountry,
                    "language": art.language,
                }
            )

        self.logger.info(
            "Parsed GDELT response",
            extra={"article_count": len(parsed), "skipped": skipped, "source": (response.get("sourceCommon", {}) if isinstance(response, dict) else None)},
        )
        return parsed
    
        """Parse raw GDELT JSON into dictionaries compatible with ``NewsArticle``."""

        try:
            gdelt_response = GdeltResponse.model_validate(response)
        except Exception as exc:  # noqa: BLE001
            raise GDELTResponseError("Malformed GDELT response", details=str(exc)) from exc

        parsed: List[Dict[str, Any]] = []
        for article in gdelt_response.articles:
            published_date = article.seen_datetime.date()
            parsed.append(
                {
                    "title": article.title,
                    "url": str(article.url),
                    "domain": article.domain,
                    "source": article.sourcename or article.domain,
                    "published_date": published_date,
                    "content": None,
                    "tone": f"{article.tone:.2f}" if article.tone is not None else None,
                    "location": article.sourcecountry,
                    "language": article.language,
                }
            )

        self.logger.info(
            "Parsed GDELT response",
            extra={"article_count": len(parsed), "source": gdelt_response.sourceCommon.url if gdelt_response.sourceCommon else None},
        )
        return parsed

    async def save_articles_to_db(self, articles: List[Dict[str, Any]]) -> List[NewsArticle]:
        """Persist parsed articles into the database with deduplication."""

        saved_articles: List[NewsArticle] = []
        for payload in articles:
            url = payload["url"]
            url_hash = hash_url(url)
            if await self.redis.sismember(self.URL_HASH_SET, url_hash):
                self.logger.debug("Skipping cached duplicate", extra={"url": url})
                continue

            existing = await self.db_session.execute(select(NewsArticle).where(NewsArticle.url == url))
            if existing.scalar_one_or_none():
                continue

            article = NewsArticle(**payload)
            self.db_session.add(article)
            saved_articles.append(article)
            await self.redis.sadd(self.URL_HASH_SET, url_hash)

        try:
            if saved_articles:
                await self.db_session.commit()
                for article in saved_articles:
                    await self.db_session.refresh(article)
        except SQLAlchemyError as exc:  # pragma: no cover - requires DB failure
            await self.db_session.rollback()
            raise GDELTDatabaseError("Failed to save articles") from exc

        return saved_articles

    async def fetch_article_content(self, url: str) -> Optional[str]:
        """Retrieve the raw HTML content of an article and return extracted text."""

        if not is_valid_url(url):
            raise GDELTContentFetchError("Invalid URL provided", details=url)

        try:
            response = await asyncio.to_thread(self.http.get, url, timeout=self.request_timeout)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
            paragraphs = [p.get_text(strip=True) for p in soup.find_all("p")]
            return "\n".join(paragraphs) if paragraphs else None
        except Exception as exc:  # noqa: BLE001
            raise GDELTContentFetchError("Failed to fetch article content", details=str(exc)) from exc

    def _cache_key(self, params: Dict[str, Any]) -> str:
        serialized = json.dumps(params, sort_keys=True)
        return f"{self.CACHE_KEY_PREFIX}:{hash_url(serialized)}"

    def _normalize_article_types(self, article: Dict[str, Any]) -> Dict[str, Any]:
        """Coerce cached JSON values back into appropriate Python types."""

        normalized = dict(article)
        published = normalized.get("published_date")
        if isinstance(published, str):
            try:
                normalized["published_date"] = datetime.fromisoformat(published).date()
            except ValueError:
                pass

        return normalized

    async def _enforce_rate_limit(self) -> None:
        current = await self.redis.incr(self.RATE_LIMIT_KEY)
        if current == 1:
            await self.redis.expire(self.RATE_LIMIT_KEY, 24 * 60 * 60)

        if current > self.RATE_LIMIT_PER_DAY:
            raise GDELTRateLimitError("Daily GDELT request quota exceeded")

    def _build_query_params(
        self,
        query: str,
        *,
        timespan: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        region: Optional[str] = None,
        language: Optional[str] = None,
    ) -> Dict[str, Any]:
        base_params: Dict[str, Any] = {
            "query": query,
            "mode": "artlist",
            "format": "json",
            "sort": "datedesc",
            "maxrecords": self.MAX_RECORDS,
        }

        if timespan:
            base_params["timespan"] = timespan
        if start_date and end_date:
            base_params["startdatetime"] = start_date
            base_params["enddatetime"] = end_date
        if region:
            base_params["sourcecountry"] = region
        if language:
            base_params["sourcelang"] = language

        return base_params

    def _is_valid_timespan(self, value: str) -> bool:
        if not value:
            return False
        units = ("h", "d", "w", "m", "y", "hour", "hours", "day", "days", "week", "weeks", "month", "months", "year", "years")
        for unit in units:
            if value.endswith(unit):
                digits = value[: -len(unit)].strip()
                return digits.isdigit()
        return False

    def _retry_after_seconds(self, response: Response) -> int:
        raw = response.headers.get("Retry-After")
        if raw:
            try:
                retry_after = int(raw)
                return max(1, min(retry_after, 300))
            except ValueError:
                return self.DEFAULT_RETRY_AFTER_SECONDS
        return self.DEFAULT_RETRY_AFTER_SECONDS

    async def _check_cooldown(self) -> None:
        ttl = await self.redis.ttl(self.COOLDOWN_KEY)
        if ttl and ttl > 0:
            raise GDELTRateLimitError(
                "GDELT cooldown active", details={"retry_after_seconds": ttl}
            )

    async def _set_cooldown(self, seconds: int) -> None:
        bounded = max(1, min(seconds, 300))
        await self.redis.set(self.COOLDOWN_KEY, "1", ex=bounded)
