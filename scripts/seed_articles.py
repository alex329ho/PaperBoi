import argparse
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path


def resolve_sqlite_path() -> Path:
    db_url = os.getenv("PAPERBOI_DATABASE_URL", "sqlite+aiosqlite:///./paperboi.db")
    if db_url.startswith("sqlite+aiosqlite:///"):
        return Path(db_url.replace("sqlite+aiosqlite:///", ""))
    if db_url.startswith("sqlite:///"):
        return Path(db_url.replace("sqlite:///", ""))
    return Path("paperboi.db")


def build_seed_articles(count: int) -> list[dict]:
    now = datetime.now(timezone.utc)
    templates = [
        ("Technology", "US", "en"),
        ("Business", "Europe", "en"),
        ("Science", "Asia", "en"),
        ("Health", "Global", "en"),
        ("Technology", "US", "es"),
        ("Business", "Europe", "fr"),
        ("Science", "Asia", "en"),
        ("Health", "Global", "en"),
        ("Technology", "US", "en"),
        ("Business", "Europe", "en"),
    ]

    articles: list[dict] = []
    for idx in range(count):
        topic, region, language = templates[idx % len(templates)]
        published_at = (now - timedelta(hours=idx * 6)).date()
        created_at = now - timedelta(hours=idx * 6)
        articles.append(
            {
                "title": f"{topic} headline {idx + 1}",
                "url": f"https://example.com/{topic.lower()}-{idx + 1}",
                "domain": "example.com",
                "source": "PaperBoi Seed",
                "published_date": published_at.isoformat(),
                "content": f"Sample content for {topic.lower()} article {idx + 1}.",
                "tone": None,
                "location": region,
                "language": language,
                "created_at": created_at.isoformat(),
            }
        )
    return articles


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS news_articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL UNIQUE,
            domain TEXT,
            source TEXT,
            published_date DATE,
            content TEXT,
            tone TEXT,
            location TEXT,
            language TEXT,
            created_at DATETIME NOT NULL
        )
        """
    )
    conn.commit()


def seed_articles(count: int, force: bool) -> None:
    db_path = resolve_sqlite_path()
    conn = sqlite3.connect(db_path)
    try:
        ensure_schema(conn)
        existing_count = conn.execute("SELECT COUNT(*) FROM news_articles").fetchone()[0]
        if existing_count and not force:
            print(f"Seed skipped: {existing_count} articles already present in {db_path}.")
            return

        articles = build_seed_articles(count)
        conn.executemany(
            """
            INSERT OR IGNORE INTO news_articles
                (title, url, domain, source, published_date, content, tone, location, language, created_at)
            VALUES
                (:title, :url, :domain, :source, :published_date, :content, :tone, :location, :language, :created_at)
            """,
            articles,
        )
        conn.commit()
        print(f"Seeded {len(articles)} articles into {db_path}.")
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the PaperBoi news_articles table.")
    parser.add_argument("--count", type=int, default=12, help="Number of articles to insert.")
    parser.add_argument("--force", action="store_true", help="Seed even if articles already exist.")
    args = parser.parse_args()
    seed_articles(args.count, args.force)


if __name__ == "__main__":
    main()
