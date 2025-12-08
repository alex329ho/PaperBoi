"""Background job implementations for PaperBoi."""
from __future__ import annotations

import asyncio
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, List, Mapping, Optional

import httpx
from redis.asyncio import Redis
from sqlalchemy import and_, delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from backend.models.email_log import EmailLog
from backend.models.news import NewsArticle, Summary
from backend.models.user import User, UserPreferences
from backend.services.email_service import EmailService
from backend.services.gdelt_service import GDELTService
from backend.services.openrouter_service import OpenRouterService
from backend.services.smtp_manager import EmailDeliveryError
from backend.utils.logger import get_logger
from backend.utils.retry_handler import execute_with_retry
from .notifications import send_job_alert
from .utils import (
    create_redis_client,
    gather_with_concurrency,
    session_scope,
    should_run_for_user,
)

logger = get_logger(__name__)


async def _get_or_create_redis(redis_client: Redis | None = None) -> Redis:
    return redis_client or await create_redis_client()


def _resolve_session_factory(session_factory: async_sessionmaker[AsyncSession] | None) -> async_sessionmaker[AsyncSession]:
    from backend.tasks.utils import get_session_factory

    return session_factory or get_session_factory()


async def fetch_daily_news(
    *,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
    redis_client: Redis | None = None,
    gdelt_service_factory: Callable[[AsyncSession, Redis], GDELTService] | None = None,
) -> dict[str, Any]:
    """Fetch fresh news for all configured users and persist unique articles."""

    session_maker = _resolve_session_factory(session_factory)
    redis = await _get_or_create_redis(redis_client)
    gdelt_factory = gdelt_service_factory or (lambda session, redis_cli: GDELTService(session, redis_cli))

    stats = {"processed_topics": 0, "new_articles": 0, "total_articles": 0}
    now = datetime.now(timezone.utc)

    async with session_scope(session_maker) as session:
        preferences = (
            await session.execute(select(UserPreferences).join(User).where(User.is_active.is_(True)))
        ).scalars()
        tasks = []
        for pref in preferences:
            topics = pref.topics or []
            regions = pref.regions or [None]
            for topic in topics:
                for region in regions:
                    stats["processed_topics"] += 1
                    tasks.append(
                        lambda topic=topic, region=region, pref=pref: _fetch_topic(
                            session, redis, gdelt_factory, topic, region, pref
                        )
                    )

        results = await gather_with_concurrency(5, tasks)
        for res in results:
            stats["new_articles"] += res.get("new", 0)
            stats["total_articles"] += res.get("total", 0)

    logger.info("Completed news fetch", extra={"stats": stats, "timestamp": now.isoformat()})
    return stats


async def _fetch_topic(
    session: AsyncSession,
    redis: Redis,
    factory: Callable[[AsyncSession, Redis], GDELTService],
    topic: str,
    region: Optional[str],
    pref: UserPreferences,
) -> dict[str, int]:
    service = factory(session, redis)
    articles = await execute_with_retry(
        lambda: service.fetch_news(topic, timespan="8hours", region=region),
        (Exception,),
        retries=3,
        base_delay=2,
        logger=logger,
    )
    urls = [article.get("url") for article in articles if article.get("url")]
    existing_urls = set(
        (await session.execute(select(NewsArticle.url).where(NewsArticle.url.in_(urls)))).scalars().all()
    )

    new_count = 0
    seen_urls = set(existing_urls)
    for article in articles:
        if article.get("url") in existing_urls:
            continue
        if article.get("url") in seen_urls:
            continue
        news_article = NewsArticle(
            title=article.get("title", ""),
            url=article.get("url", ""),
            domain=article.get("domain"),
            source=article.get("source"),
            published_date=(article.get("published_date") or datetime.utcnow().date()),
            content=article.get("content"),
            tone=str(article.get("tone")) if article.get("tone") is not None else None,
            location=article.get("location"),
            language=article.get("language"),
        )
        session.add(news_article)
        new_count += 1
        seen_urls.add(news_article.url)

    logger.info(
        "Fetched articles for topic",
        extra={"topic": topic, "region": region, "new": new_count, "total": len(articles)},
    )
    return {"new": new_count, "total": len(articles)}


async def generate_daily_summaries(
    *,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
    redis_client: Redis | None = None,
    summarizer_factory: Callable[[Redis], OpenRouterService] | None = None,
) -> dict[str, Any]:
    """Generate summaries for recent articles lacking coverage."""

    session_maker = _resolve_session_factory(session_factory)
    redis = await _get_or_create_redis(redis_client)
    summarizer_builder = summarizer_factory or (lambda redis_cli: OpenRouterService(redis_cli))
    summarizer = summarizer_builder(redis)

    window_start = datetime.now(timezone.utc) - timedelta(hours=8)
    stats = {"summaries_created": 0, "articles_seen": 0}

    async with session_scope(session_maker) as session:
        query = (
            select(NewsArticle)
            .options(selectinload(NewsArticle.summaries))
            .where(NewsArticle.created_at >= window_start)
        )
        articles = (await session.execute(query)).scalars().all()
        stats["articles_seen"] = len(articles)

        async def _summarize(article: NewsArticle) -> None:
            if article.summaries:
                return
            summary_text = await summarizer.summarize(
                article.content or "", article.title, length="MEDIUM", article_id=str(article.id)
            )
            summary = Summary(
                article_id=article.id,
                summary_text=summary_text,
                length=len(summary_text.split()),
                model_used=summarizer.DEFAULT_MODEL,
            )
            session.add(summary)
            stats["summaries_created"] += 1

        await gather_with_concurrency(5, [lambda art=article: _summarize(art) for article in articles])

    logger.info("Summary generation complete", extra=stats)
    return stats


async def send_daily_emails(
    *,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
    redis_client: Redis | None = None,
    email_service_factory: Callable[[], EmailService] | None = None,
) -> dict[str, Any]:
    """Compile and send daily summary emails to opted-in users."""

    session_maker = _resolve_session_factory(session_factory)
    redis = await _get_or_create_redis(redis_client)
    service = email_service_factory() if email_service_factory else EmailService()

    now = datetime.now(timezone.utc)
    stats = {"attempted": 0, "sent": 0, "skipped": 0}

    async with session_scope(session_maker) as session:
        users = (
            await session.execute(
                select(User).options(selectinload(User.preferences)).where(User.is_active.is_(True))
            )
        ).scalars()

        for user in users:
            pref = user.preferences
            if not pref or not pref.notification_enabled:
                stats["skipped"] += 1
                continue
            if not should_run_for_user(pref.notification_time, now):
                stats["skipped"] += 1
                continue

            summaries = await _load_user_summaries(session, user)
            if not summaries:
                stats["skipped"] += 1
                continue

            try:
                service.send_daily_summary(str(user.id), summaries)
                stats["sent"] += 1
                email_log = EmailLog(
                    user_id=user.id,
                    recipients=[user.email],
                    subject="PaperBoi Daily Digest",
                    status="sent",
                )
            except Exception as exc:  # noqa: BLE001
                logger.error("Failed to send summary", extra={"user": user.email, "error": str(exc)})
                email_log = EmailLog(
                    user_id=user.id,
                    recipients=[user.email],
                    subject="PaperBoi Daily Digest",
                    status="failed",
                    error_message=str(exc),
                )
            session.add(email_log)
            stats["attempted"] += 1

    await redis.publish("paperboi:notifications", f"sent:{stats['sent']}")
    logger.info("Email dispatch complete", extra=stats)
    return stats


async def _load_user_summaries(session: AsyncSession, user: User) -> List[Mapping[str, Any]]:
    recent_window = datetime.now(timezone.utc) - timedelta(days=1)
    query = (
        select(Summary)
        .join(NewsArticle)
        .join(UserPreferences, isouter=True)
        .where(
            and_(
                Summary.created_at >= recent_window,
                NewsArticle.created_at >= recent_window,
            )
        )
        .options(selectinload(Summary.article))
        .order_by(Summary.created_at.desc())
    )
    summaries = (await session.execute(query)).scalars().all()
    payload: List[Mapping[str, Any]] = []
    for summary in summaries:
        payload.append(
            {
                "title": summary.article.title if summary.article else "",
                "summary": summary.summary_text,
                "url": summary.article.url if summary.article else "",
                "published_date": summary.article.published_date.isoformat() if summary.article else "",
            }
        )
    return payload


async def update_trending_topics(
    *,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
    redis_client: Redis | None = None,
) -> dict[str, Any]:
    """Analyze article frequency and cache trending topics."""

    session_maker = _resolve_session_factory(session_factory)
    redis = await _get_or_create_redis(redis_client)
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    async with session_scope(session_maker) as session:
        articles = (
            await session.execute(select(NewsArticle).where(NewsArticle.created_at >= since))
        ).scalars()
        counter: Counter[str] = Counter()
        for article in articles:
            if article.title:
                for word in (article.title or "").split():
                    if len(word) > 4:
                        counter[word.lower()] += 1
        top_topics = counter.most_common(20)
        if top_topics:
            await redis.zadd("paperboi:trending", {topic: score for topic, score in top_topics})
        logger.info("Trending topics updated", extra={"topics": top_topics})
        return {"topics": top_topics}


async def cleanup_expired_data(
    *,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
    redis_client: Redis | None = None,
) -> dict[str, Any]:
    """Purge expired cache entries and old database rows."""

    session_maker = _resolve_session_factory(session_factory)
    redis = await _get_or_create_redis(redis_client)

    article_cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    email_cutoff = datetime.now(timezone.utc) - timedelta(days=30)

    async with session_scope(session_maker) as session:
        article_result = await session.execute(
            delete(NewsArticle).where(NewsArticle.created_at < article_cutoff)
        )
        email_result = await session.execute(delete(EmailLog).where(EmailLog.created_at < email_cutoff))
        deleted_articles = article_result.rowcount or 0
        deleted_emails = email_result.rowcount or 0

        # Vacuum for Postgres/SQLite
        try:
            await session.execute(text("VACUUM"))
        except Exception:
            logger.debug("VACUUM not supported on current database")

    await redis.flushdb(asynchronous=True)
    logger.info(
        "Cleanup completed",
        extra={"deleted_articles": deleted_articles, "deleted_emails": deleted_emails},
    )
    return {"deleted_articles": deleted_articles, "deleted_emails": deleted_emails}


async def check_api_health(
    *,
    redis_client: Redis | None = None,
) -> dict[str, Any]:
    """Verify dependencies are reachable and responsive."""

    redis = await _get_or_create_redis(redis_client)
    health = {"gdelt": False, "openrouter": False, "database": False, "redis": False}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get("https://api.gdeltproject.org/api/v2/doc/doc", params={"query": "health", "maxrecords": 1})
            health["gdelt"] = response.status_code == 200
    except httpx.HTTPError as exc:
        logger.warning("GDELT health check failed", extra={"error": str(exc)})

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get("https://openrouter.ai/health")
            health["openrouter"] = response.status_code < 500
    except httpx.HTTPError as exc:
        logger.warning("OpenRouter health check failed", extra={"error": str(exc)})

    try:
        # Lazy import to avoid circular dependency at module load
        from backend.models.database import validate_connection

        await validate_connection()
        health["database"] = True
    except Exception as exc:  # noqa: BLE001
        logger.error("Database health check failed", extra={"error": str(exc)})

    try:
        await redis.ping()
        health["redis"] = True
    except Exception as exc:  # noqa: BLE001
        logger.error("Redis health check failed", extra={"error": str(exc)})

    status = {"status": "ok" if all(health.values()) else "degraded", **health}
    logger.info("API health check", extra=status)
    if status["status"] == "degraded":
        send_job_alert("Health checks degraded", extra=status)
    return status


async def retry_failed_emails(
    *,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
    email_service_factory: Callable[[], EmailService] | None = None,
) -> dict[str, Any]:
    """Retry delivery for failed outbound emails."""

    session_maker = _resolve_session_factory(session_factory)
    service = email_service_factory() if email_service_factory else EmailService()
    stats = {"retried": 0, "recovered": 0, "still_failed": 0}

    async with session_scope(session_maker) as session:
        failed_logs = (
            await session.execute(select(EmailLog).where(EmailLog.status == "failed"))
        ).scalars()
        for log_entry in failed_logs:
            stats["retried"] += 1
            try:
                recipient = log_entry.recipients[0] if log_entry.recipients else None
                if recipient:
                    service.send_batch_email([recipient], log_entry.subject, "Retrying previous email")
                log_entry.status = "sent"
                stats["recovered"] += 1
            except EmailDeliveryError as exc:
                log_entry.status = "failed"
                log_entry.error_message = str(exc)
                stats["still_failed"] += 1
        await session.flush()

    logger.info("Email retries processed", extra=stats)
    return stats
