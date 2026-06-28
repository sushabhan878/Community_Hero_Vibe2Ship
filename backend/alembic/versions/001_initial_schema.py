"""Initial schema: all tables, enums, indexes, triggers, RLS, seed data

Revision ID: 001
Revises:
Create Date: 2026-06-28
"""
from pathlib import Path

from alembic import op
from sqlalchemy import text

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    sql_path = Path(__file__).resolve().parent.parent.parent / "migrations" / "001_initial_schema.sql"
    sql = sql_path.read_text(encoding="utf-8")

    for statement in sql.split(";"):
        stripped = statement.strip()
        if stripped:
            op.execute(text(stripped + ";"))


def downgrade():
    op.execute("DROP TABLE IF EXISTS push_tokens CASCADE")
    op.execute("DROP TABLE IF EXISTS badges CASCADE")
    op.execute("DROP TABLE IF EXISTS notifications CASCADE")
    op.execute("DROP TABLE IF EXISTS issue_updates CASCADE")
    op.execute("DROP TABLE IF EXISTS verifications CASCADE")
    op.execute("DROP TABLE IF EXISTS issues CASCADE")
    op.execute("DROP TABLE IF EXISTS profiles CASCADE")
    op.execute("DROP TABLE IF EXISTS departments CASCADE")
    op.execute("DROP TYPE IF EXISTS badge_slug")
    op.execute("DROP TYPE IF EXISTS notification_type")
    op.execute("DROP TYPE IF EXISTS update_type")
    op.execute("DROP TYPE IF EXISTS issue_status")
    op.execute("DROP TYPE IF EXISTS issue_severity")
    op.execute("DROP TYPE IF EXISTS issue_category")
    op.execute("DROP TYPE IF EXISTS department_slug")
    op.execute("DROP TYPE IF EXISTS user_role")
