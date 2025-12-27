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
from sqlalchemy import or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from backend.config import settings
from backend.models.gdelt_raw import GdeltRawArticle
from backend.models.news import NewsArticle
from backend.schemas.gdelt import GdeltArticle, GdeltResponse
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
    TRACKING_PARAMS = {
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "gclid",
        "fbclid",
        "mc_cid",
        "mc_eid",
    }

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
                    "Timespan must be a number plus unit (h, d, w, m, y, min) or full words like 'minutes', 'hours', 'days', 'weeks', 'months', 'years'"
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
        try:
            response_data = await self._execute_request(params)
        except GDELTRateLimitError:
            if settings.environment != "production":
                fallback = await self._load_fallback_articles()
                if fallback:
                    self.logger.info(
                        "Using fallback articles due to GDELT rate limit",
                        extra={"count": len(fallback)},
                    )
                    return fallback
                self.logger.warning("GDELT rate limited and no fallback articles available")
                return []
            raise
        raw_articles = response_data.get("articles", []) if isinstance(response_data, dict) else []
        if raw_articles:
            try:
                await self._save_raw_articles(raw_articles)
            except Exception as exc:  # noqa: BLE001
                self.logger.warning("Failed to persist raw GDELT payloads", extra={"error": str(exc)})
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
            canonical_url = self._canonicalize_url(str(art.url))
            url_hash = self._compute_url_hash(canonical_url)
            parsed.append(
                {
                    "title": art.title or "",
                    "url": canonical_url,
                    "url_hash": url_hash,
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
        skipped_cache = 0
        skipped_db = 0

        if not articles:
            return saved_articles

        normalized: List[Dict[str, Any]] = []
        seen_hashes: set[str] = set()
        for payload in articles:
            url = payload.get("url")
            if not url:
                continue
            canonical_url = self._canonicalize_url(url)
            url_hash = payload.get("url_hash") or self._compute_url_hash(canonical_url)
            if url_hash in seen_hashes:
                skipped_db += 1
                continue
            seen_hashes.add(url_hash)
            normalized.append({**payload, "url": canonical_url, "url_hash": url_hash})

        if settings.environment == "production":
            filtered: List[Dict[str, Any]] = []
            for payload in normalized:
                url_hash = payload["url_hash"]
                if await self.redis.sismember(self.URL_HASH_SET, url_hash):
                    self.logger.debug("Skipping cached duplicate", extra={"url": payload["url"]})
                    skipped_cache += 1
                    continue
                filtered.append(payload)
            normalized = filtered

        if not normalized:
            self.logger.info(
                "GDELT save results",
                extra={"saved": 0, "skipped_cache": skipped_cache, "skipped_db": skipped_db, "total": len(articles)},
            )
            return saved_articles

        url_hashes = [payload["url_hash"] for payload in normalized]
        urls = [payload["url"] for payload in normalized]
        existing = await self.db_session.execute(
            select(NewsArticle.url_hash, NewsArticle.url).where(
                or_(NewsArticle.url_hash.in_(url_hashes), NewsArticle.url.in_(urls))
            )
        )
        existing_rows = existing.all()
        existing_hashes = {row[0] for row in existing_rows if row[0]}
        existing_urls = {row[1] for row in existing_rows if row[1]}

        new_payloads: List[Dict[str, Any]] = []
        for payload in normalized:
            if payload["url_hash"] in existing_hashes or payload["url"] in existing_urls:
                skipped_db += 1
                continue
            new_payloads.append(payload)

        try:
            if new_payloads:
                insert_fn = sqlite_insert if self._is_sqlite() else pg_insert
                stmt = insert_fn(NewsArticle).values(new_payloads).on_conflict_do_nothing(
                    index_elements=["url_hash"]
                )
                await self.db_session.execute(stmt)
                await self.db_session.commit()

                inserted_hashes = [payload["url_hash"] for payload in new_payloads]
                result = await self.db_session.execute(
                    select(NewsArticle).where(NewsArticle.url_hash.in_(inserted_hashes))
                )
                saved_articles = result.scalars().all()

                if settings.environment == "production" and saved_articles:
                    for article in saved_articles:
                        if article.url_hash:
                            await self.redis.sadd(self.URL_HASH_SET, article.url_hash)
        except SQLAlchemyError as exc:  # pragma: no cover - requires DB failure
            await self.db_session.rollback()
            raise GDELTDatabaseError("Failed to save articles") from exc
        finally:
            self.logger.info(
                "GDELT save results",
                extra={
                    "saved": len(saved_articles),
                    "skipped_cache": skipped_cache,
                    "skipped_db": skipped_db,
                    "total": len(articles),
                },
            )

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

    def _is_sqlite(self) -> bool:
        return settings.database_url.startswith("sqlite")

    def _canonicalize_url(self, raw_url: str) -> str:
        cleaned = raw_url.strip()
        try:
            parts = urlsplit(cleaned)
        except ValueError:
            return cleaned

        scheme = (parts.scheme or "https").lower()
        host = (parts.hostname or "").lower()
        if not host:
            return cleaned

        port = parts.port
        if (scheme == "https" and port == 443) or (scheme == "http" and port == 80):
            port = None
        netloc = host if port is None else f"{host}:{port}"

        path = parts.path or "/"
        if path != "/" and path.endswith("/"):
            path = path[:-1]

        query_params = [
            (key, value)
            for key, value in parse_qsl(parts.query, keep_blank_values=False)
            if key.lower() not in self.TRACKING_PARAMS
        ]
        query_params.sort(key=lambda kv: (kv[0], kv[1]))
        query = urlencode(query_params)

        return urlunsplit((scheme, netloc, path, query, ""))

    def _compute_url_hash(self, canonical_url: str) -> str:
        return hash_url(canonical_url)

    async def _save_raw_articles(self, raw_articles: List[Dict[str, Any]]) -> None:
        if not raw_articles or self.db_session is None:
            return

        rows: List[Dict[str, Any]] = []
        for raw in raw_articles:
            raw_url = raw.get("url")
            if not raw_url:
                continue
            try:
                art = GdeltArticle.model_validate(raw)
                canonical_url = self._canonicalize_url(str(art.url))
                seendate = art.seen_datetime
                sourcecountry = art.sourcecountry
                language = art.language
            except Exception:
                canonical_url = self._canonicalize_url(str(raw_url))
                seendate = None
                sourcecountry = raw.get("sourcecountry")
                language = raw.get("language")

            url_hash = self._compute_url_hash(canonical_url)
            rows.append(
                {
                    "url": canonical_url,
                    "url_hash": url_hash,
                    "seendate": seendate,
                    "sourcecountry": sourcecountry,
                    "language": language,
                    "raw": raw,
                }
            )

        if not rows:
            return

        insert_fn = sqlite_insert if self._is_sqlite() else pg_insert
        stmt = insert_fn(GdeltRawArticle).values(rows).on_conflict_do_nothing(
            index_elements=["url_hash"]
        )
        await self.db_session.execute(stmt)

    async def _load_fallback_articles(self, limit: int = 10) -> List[Dict[str, Any]]:
        if self.db_session is None:
            return []
        try:
            result = await self.db_session.execute(
                select(NewsArticle).order_by(NewsArticle.created_at.desc()).limit(limit)
            )
            articles = result.scalars().all()
        except Exception as exc:  # noqa: BLE001
            self.logger.warning("Failed to load fallback articles", extra={"error": str(exc)})
            return []
        return [self._article_to_payload(article) for article in articles]

    @staticmethod
    def _article_to_payload(article: NewsArticle) -> Dict[str, Any]:
        return {
            "title": article.title,
            "url": article.url,
            "url_hash": article.url_hash,
            "domain": article.domain,
            "source": article.source,
            "published_date": article.published_date,
            "content": article.content,
            "tone": article.tone,
            "location": article.location,
            "language": article.language,
        }

    async def _enforce_rate_limit(self) -> None:
        if settings.environment != "production":
            return
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
        units = (
            "minutes",
            "minute",
            "hours",
            "hour",
            "days",
            "day",
            "weeks",
            "week",
            "months",
            "month",
            "years",
            "year",
            "mins",
            "min",
            "h",
            "d",
            "w",
            "m",
            "y",
        )
        for unit in units:
            if value.endswith(unit):
                digits = value[: -len(unit)].strip()
                if digits.isdigit():
                    return True
                continue
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

    async def _get_ttl(self, key: str) -> int | None:
        ttl_func = getattr(self.redis, "ttl", None)
        if callable(ttl_func):
            result = ttl_func(key)
            return await result if asyncio.iscoroutine(result) else result
        pttl_func = getattr(self.redis, "pttl", None)
        if callable(pttl_func):
            result = pttl_func(key)
            ttl_ms = await result if asyncio.iscoroutine(result) else result
            if ttl_ms is None:
                return None
            return int(ttl_ms / 1000) if ttl_ms >= 0 else ttl_ms
        return None

    async def _check_cooldown(self) -> None:
        if settings.environment != "production":
            return
        ttl = await self._get_ttl(self.COOLDOWN_KEY)
        if ttl and ttl > 0:
            raise GDELTRateLimitError(
                "GDELT cooldown active", details={"retry_after_seconds": ttl}
            )

    async def _set_cooldown(self, seconds: int) -> None:
        if settings.environment != "production":
            return
        bounded = max(1, min(seconds, 300))
        await self.redis.set(self.COOLDOWN_KEY, "1", ex=bounded)
