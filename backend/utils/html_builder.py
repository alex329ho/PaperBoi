"""Utilities for rendering HTML email templates."""
from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, Mapping

from bs4 import BeautifulSoup
from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).resolve().parents[1] / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml"]),
    enable_async=False,
    trim_blocks=True,
    lstrip_blocks=True,
)
_env.globals.update(now=datetime.utcnow)


def get_environment() -> Environment:
    """Return a configured Jinja2 environment for email templates."""

    return _env


def render_template(template_name: str, context: Mapping[str, Any]) -> str:
    """Render an HTML template with the provided context."""

    template = _env.get_template(template_name)
    return template.render(**context)


def render_daily_summary(
    *,
    user_name: str | None,
    summaries: Iterable[Mapping[str, Any]],
    preferences_url: str,
    unsubscribe_url: str,
) -> str:
    """Render the daily summary email."""

    article_list = list(summaries)
    context: Dict[str, Any] = {
        "user_name": user_name or "there",
        "date": datetime.utcnow().strftime("%B %d, %Y"),
        "count": len(article_list),
        "articles": article_list,
        "preferences_url": preferences_url,
        "unsubscribe_url": unsubscribe_url,
    }
    return render_template("daily_summary.html", context)


def render_single_article(
    *, user_name: str | None, article: Mapping[str, Any], preferences_url: str, unsubscribe_url: str
) -> str:
    """Render a single article notification email."""

    context = {
        "user_name": user_name or "there",
        "article": article,
        "sent_at": datetime.utcnow().strftime("%B %d, %Y"),
        "preferences_url": preferences_url,
        "unsubscribe_url": unsubscribe_url,
    }
    return render_template("single_article.html", context)


def render_welcome_email(
    *, user_name: str | None, preferences_url: str, faq_url: str, unsubscribe_url: str
) -> str:
    """Render the welcome email."""

    context = {
        "user_name": user_name or "there",
        "preferences_url": preferences_url,
        "faq_url": faq_url,
        "unsubscribe_url": unsubscribe_url,
    }
    return render_template("welcome.html", context)


def html_to_text(html: str) -> str:
    """Convert HTML content to a plain text fallback using BeautifulSoup."""

    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text("\n", strip=True)
