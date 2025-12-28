"""News-related API endpoints."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.dependencies import get_db_session, get_gdelt_service, get_summarization_service
from backend.middleware.rate_limit import RateLimiter
from backend.models.news import NewsArticle, Summary
from backend.schemas.news import NewsArticleRead, SummaryRead
from backend.services.gdelt_service import GDELTService
from backend.services.exceptions import GDELTRateLimitError
from backend.services.summarization import SummarizationService
from backend.utils.logger import get_logger

router = APIRouter(prefix="/news", tags=["news"])
logger = get_logger(__name__)

rate_limiter = RateLimiter()


def envelope(data: Any, *, pagination: dict | None = None, message: str | None = None) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "success": True,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if pagination:
        payload["pagination"] = pagination
    if message:
        payload["message"] = message
    return payload


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    topics: list[str] = Field(default_factory=list)
    regions: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    sort_by: str | None = Field(default=None, pattern="^(relevance|recent|trending|tone)$")


class FreshFetchRequest(BaseModel):
    query: str = Field(..., description="Search phrase for new articles")
    timespan: str = Field(default="8hours", description="Timespan string accepted by GDELT")
    region: Optional[str] = Field(default=None, description="Two-letter region code")
    language: Optional[str] = Field(default=None, description="ISO language code")


class SummaryRequest(BaseModel):
    length: str = Field(default="LONG", description="Desired summary length")


class TrendingTopic(BaseModel):
    topic: str
    count: int


@router.get(
    "",
    summary="Fetch recent news",
    dependencies=[Depends(rate_limiter.dependency("news:list"))],
)
async def list_news(
    topics: Optional[str] = Query(None, description="Comma separated topics"),
    regions: Optional[str] = Query(None, description="Comma separated regions"),
    languages: Optional[str] = Query(None, description="Comma separated languages"),
    hours: int = Query(8, ge=1, le=168),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    sort: Optional[str] = Query("recent", pattern="^(recent|trending|relevance|tone)$"),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Return a paginated list of recent news articles with filtering."""

    query = select(NewsArticle)
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    query = query.where(NewsArticle.created_at >= cutoff)

    if topics:
        topic_list = [t.strip() for t in topics.split(",") if t.strip()]
        for topic in topic_list:
            query = query.where(NewsArticle.title.ilike(f"%{topic}%"))
    if regions:
        region_list = [r.strip() for r in regions.split(",") if r.strip()]
        query = query.where(NewsArticle.location.in_(region_list))
    if languages:
        language_list = [l.strip() for l in languages.split(",") if l.strip()]
        query = query.where(NewsArticle.language.in_(language_list))

    if sort == "recent":
        query = query.order_by(NewsArticle.published_date.desc().nullslast())
    elif sort == "tone":
        query = query.order_by(NewsArticle.tone.desc().nullslast())
    else:
        query = query.order_by(NewsArticle.created_at.desc())

    total = (await session.execute(query.with_only_columns(func.count()))).scalar_one()
    result = await session.execute(query.limit(limit).offset(offset))
    articles = result.scalars().all()

    payload = [NewsArticleRead.model_validate(article).model_dump() for article in articles]
    pagination = {"total": total, "limit": limit, "offset": offset}
    return envelope(payload, pagination=pagination)


@router.get(
    "/{article_id}",
    summary="Get single article details",
    dependencies=[Depends(rate_limiter.dependency("news:detail"))],
)
async def get_article(
    article_id: int,
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Return details for a specific article."""

    result = await session.execute(select(NewsArticle).where(NewsArticle.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")
    return envelope(NewsArticleRead.model_validate(article).model_dump())


@router.post(
    "/search",
    summary="Search news by multiple criteria",
    dependencies=[Depends(rate_limiter.dependency("news:search"))],
)
async def search_news(
    payload: SearchRequest,
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Search articles using a flexible filter set."""

    query = select(NewsArticle)
    if payload.query:
        query = query.where(NewsArticle.title.ilike(f"%{payload.query}%"))
    if payload.topics:
        for topic in payload.topics:
            query = query.where(NewsArticle.title.ilike(f"%{topic}%"))
    if payload.regions:
        query = query.where(NewsArticle.location.in_(payload.regions))
    if payload.languages:
        query = query.where(NewsArticle.language.in_(payload.languages))
    if payload.start_date:
        query = query.where(NewsArticle.published_date >= payload.start_date)
    if payload.end_date:
        query = query.where(NewsArticle.published_date <= payload.end_date)

    result = await session.execute(query.order_by(NewsArticle.published_date.desc().nullslast()))
    articles = result.scalars().all()
    return envelope([NewsArticleRead.model_validate(article).model_dump() for article in articles])


@router.post(
    "/fetch-fresh",
    summary="Manually trigger fresh news fetch",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limiter.dependency("news:fresh"))],
)
async def fetch_fresh(
    body: FreshFetchRequest,
    service: GDELTService = Depends(get_gdelt_service),
) -> Dict[str, Any]:
    """Trigger a GDELT fetch and return normalized articles."""

    try:
        articles = await service.fetch_news(
            body.query, timespan=body.timespan, region=body.region, language=body.language
        )
        saved_articles = await service.save_articles_to_db(articles)
    except GDELTRateLimitError as exc:
        logger.warning("Fresh fetch rate limited", extra={"error": str(exc)})
        if settings.environment != "production":
            fallback = await service._load_fallback_articles()
            message = (
                "GDELT rate limited; returned cached articles."
                if fallback
                else "GDELT rate limited; no cached articles available."
            )
            payload = envelope(fallback, message=message)
            payload["saved_count"] = 0
            return payload
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="GDELT rate limit reached. Try again later.",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Fresh fetch failed", extra={"error": str(exc)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upstream news provider unavailable",
        ) from exc
    payload = envelope(articles, message="Fresh fetch triggered")
    payload["saved_count"] = len(saved_articles)
    return payload


@router.get(
    "/trending",
    summary="Get trending topics",
    dependencies=[Depends(rate_limiter.dependency("news:trending"))],
)
async def trending_topics(
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_db_session),
) -> Dict[str, Any]:
    """Return a list of trending topics based on article titles."""

    topic_query = (
        select(NewsArticle.title)
        .where(NewsArticle.published_date != None)  # noqa: E711
        .order_by(NewsArticle.published_date.desc())
        .limit(500)
    )
    result = await session.execute(topic_query)
    titles = result.scalars().all()
    counts: dict[str, int] = {}
    for title in titles:
        for word in title.split():
            normalized = word.strip(".,!?").lower()
            if len(normalized) < 4:
                continue
            counts[normalized] = counts.get(normalized, 0) + 1
    sorted_topics = sorted(counts.items(), key=lambda item: item[1], reverse=True)[:limit]
    payload = [TrendingTopic(topic=topic, count=count).model_dump() for topic, count in sorted_topics]
    return envelope(payload)


@router.post(
    "/{article_id}/summarize",
    summary="Generate summary for article",
    dependencies=[Depends(rate_limiter.dependency("news:summarize"))],
)
async def summarize_article(
    article_id: int,
    payload: SummaryRequest = Body(default_factory=SummaryRequest),
    session: AsyncSession = Depends(get_db_session),
    summarizer: SummarizationService = Depends(get_summarization_service),
    gdelt_service: GDELTService = Depends(get_gdelt_service),
) -> Dict[str, Any]:
    """Generate and persist a summary for a given article."""

    result = await session.execute(select(NewsArticle).where(NewsArticle.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    if not article.content:
        try:
            fetched_content = await gdelt_service.fetch_article_content(article.url)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Failed to fetch article content for summary",
                extra={"article_id": article.id, "url": article.url, "error": str(exc)},
            )
            fetched_content = None
        if fetched_content:
            article.content = fetched_content
            await session.commit()
            await session.refresh(article)

    article_payload = {
        "id": article.id,
        "title": article.title,
        "content": article.content or article.title or "",
    }
    report = await summarizer.generate_report(article_payload, length=payload.length)
    summary_text = report.get("summary") or ""
    summary = Summary(article_id=article.id, summary_text=summary_text, length=len(summary_text.split()))
    session.add(summary)
    await session.commit()
    await session.refresh(summary)

    response_payload = SummaryRead.model_validate(summary).model_dump()
    response_payload["report"] = report
    response_payload["summary"] = summary_text
    return envelope(response_payload)


__all__ = ["router"]
