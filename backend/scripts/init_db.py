"""
Run this script to apply the initial schema to your Supabase database.

Usage:
    python scripts/init_db.py

Requires DATABASE_URL in .env pointing to your Supabase PostgreSQL instance.
"""
import asyncio
import os
import sys
from pathlib import Path

# Ensure we can import from app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings


async def run_migration():
    sql_path = Path(__file__).resolve().parent.parent / "migrations" / "001_initial_schema.sql"
    if not sql_path.exists():
        print(f"ERROR: Migration file not found at {sql_path}")
        sys.exit(1)

    sql = sql_path.read_text(encoding="utf-8")

    print(f"Connecting to: {settings.DATABASE_URL[:60]}...")
    print("This will create all tables, indexes, triggers, RLS policies, and seed data.")
    print()

    confirm = input("Continue? (yes/no): ")
    if confirm.lower() not in ("yes", "y"):
        print("Aborted.")
        return

    try:
        import asyncpg
    except ImportError:
        print("Installing asyncpg...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "asyncpg", "-q"])
        import asyncpg

    # Convert asyncpg URL (asyncpg uses postgresql:// not postgresql+asyncpg://)
    db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")

    conn = await asyncpg.connect(db_url)
    try:
        print("Running migration...")

        # Split by statement semicolons, but be careful with dollar-quoted functions
        # Better approach: run the whole script as a single command
        # asyncpg can handle multiple statements separated by ;
        await conn.execute(sql)

        print()
        print("SUCCESS! Migration completed.")
        print()
        print("What was created:")
        print("  ─ Extensions: uuid-ossp, postgis, pg_trgm")
        print("  ─ 6 enums: user_role, department_slug, issue_category, issue_severity, issue_status, ...")
        print("  ─ 8 tables: departments, profiles, issues, verifications, issue_updates, notifications, badges, push_tokens")
        print("  ─ Indexes on all foreign keys + spatial index on issues.location")
        print("  ─ Triggers: auto-geo, updated_at, verification count/promote, auto-profile on signup")
        print("  ─ RLS policies on all tables")
        print("  ─ 6 seed departments")
        print()
        print("Next step: set SUPABASE_JWT_SECRET in your .env file")
        print("  (Find it in Supabase Dashboard → Project Settings → API → JWT Secret)")

    except Exception as e:
        print(f"ERROR during migration: {e}")
        print()
        print("Tip: You can also paste the SQL from migrations/001_initial_schema.sql")
        print("     directly into Supabase SQL Editor (Dashboard → SQL Editor).")
        sys.exit(1)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(run_migration())
