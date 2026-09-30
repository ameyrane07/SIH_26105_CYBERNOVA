import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# -----------------------------------------------------------------
# DATABASE CONNECTION
# -----------------------------------------------------------------
# Reads DATABASE_URL from the environment so the same code works
# against a local PostgreSQL install, a Docker container, or a
# free cloud-hosted Postgres (Neon / Supabase / Railway).
#
# Example values for DATABASE_URL:
#   postgresql://user:password@localhost:5432/cybernova
#   postgresql://user:password@ep-xxxx.neon.tech/cybernova
#
# Falls back to a local SQLite file if DATABASE_URL is not set,
# so the app still runs out-of-the-box for local development or
# quick testing without needing Postgres configured first.
# -----------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cybernova.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()