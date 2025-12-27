"""Backfill url_hash for existing news_articles rows."""
from __future__ import annotations

import hashlib
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251228_backfill_news_url_hash"
down_revision = "20251228_add_gdelt_raw_and_url_hash"
branch_labels = None
depends_on = None

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


def canonicalize_url(raw_url: str) -> str:
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
        if key.lower() not in TRACKING_PARAMS
    ]
    query_params.sort(key=lambda kv: (kv[0], kv[1]))
    query = urlencode(query_params)

    return urlunsplit((scheme, netloc, path, query, ""))


def compute_hash(canonical_url: str) -> str:
    return hashlib.md5(canonical_url.encode("utf-8")).hexdigest()


def upgrade() -> None:
    conn = op.get_bind()
    if conn is None:
        return

    existing = conn.execute(
        sa.text("SELECT url_hash FROM news_articles WHERE url_hash IS NOT NULL AND url_hash != ''")
    ).fetchall()
    seen = {row[0] for row in existing if row[0]}

    rows = conn.execute(
        sa.text("SELECT id, url FROM news_articles WHERE url_hash IS NULL OR url_hash = ''")
    ).fetchall()

    updates = []
    for row in rows:
        raw_url = row[1] or ""
        canonical = canonicalize_url(raw_url)
        if not canonical:
            continue
        url_hash = compute_hash(canonical)
        if url_hash in seen:
            continue
        seen.add(url_hash)
        updates.append({"id": row[0], "url_hash": url_hash})

    if updates:
        conn.execute(
            sa.text("UPDATE news_articles SET url_hash = :url_hash WHERE id = :id"),
            updates,
        )


def downgrade() -> None:
    pass
