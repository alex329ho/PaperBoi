"""Add GDELT raw ingestion table and url_hash for news articles."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20251228_add_gdelt_raw_and_url_hash"
down_revision = None
branch_labels = None
depends_on = None


def _raw_payload_type():
    bind = op.get_bind()
    if bind and bind.dialect.name == "postgresql":
        return postgresql.JSONB(astext_type=sa.Text())
    return sa.JSON()


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    created_raw = False
    if not inspector.has_table("gdelt_raw_articles"):
        op.create_table(
            "gdelt_raw_articles",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("url", sa.Text(), nullable=False),
            sa.Column("url_hash", sa.String(length=64), nullable=False),
            sa.Column("seendate", sa.DateTime(timezone=True), nullable=True),
            sa.Column("sourcecountry", sa.String(length=10), nullable=True),
            sa.Column("language", sa.String(length=10), nullable=True),
            sa.Column("raw", _raw_payload_type(), nullable=False),
            sa.Column(
                "fetched_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
        )
        created_raw = True

    if created_raw:
        op.create_index(
            "ix_gdelt_raw_articles_url_hash",
            "gdelt_raw_articles",
            ["url_hash"],
            unique=True,
        )
        op.create_index(
            "ix_gdelt_raw_articles_fetched_at",
            "gdelt_raw_articles",
            ["fetched_at"],
        )
    else:
        raw_indexes = {idx["name"] for idx in inspector.get_indexes("gdelt_raw_articles")}
        if "ix_gdelt_raw_articles_url_hash" not in raw_indexes:
            op.create_index(
                "ix_gdelt_raw_articles_url_hash",
                "gdelt_raw_articles",
                ["url_hash"],
                unique=True,
            )
        if "ix_gdelt_raw_articles_fetched_at" not in raw_indexes:
            op.create_index(
                "ix_gdelt_raw_articles_fetched_at",
                "gdelt_raw_articles",
                ["fetched_at"],
            )

    news_columns = {col["name"] for col in inspector.get_columns("news_articles")}
    if "url_hash" not in news_columns:
        with op.batch_alter_table("news_articles") as batch:
            batch.add_column(sa.Column("url_hash", sa.String(length=64), nullable=True))

    news_indexes = {idx["name"] for idx in inspector.get_indexes("news_articles")}
    if "ix_news_articles_url_hash" not in news_indexes:
        with op.batch_alter_table("news_articles") as batch:
            batch.create_index("ix_news_articles_url_hash", ["url_hash"], unique=True)


def downgrade() -> None:
    with op.batch_alter_table("news_articles") as batch:
        batch.drop_index("ix_news_articles_url_hash")
        batch.drop_column("url_hash")

    op.drop_index("ix_gdelt_raw_articles_fetched_at", table_name="gdelt_raw_articles")
    op.drop_index("ix_gdelt_raw_articles_url_hash", table_name="gdelt_raw_articles")
    op.drop_table("gdelt_raw_articles")
