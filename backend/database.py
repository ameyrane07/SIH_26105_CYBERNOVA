import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# -----------------------------------------------------------------
# DATABASE CONFIGURATION
# -----------------------------------------------------------------
# Reads DATABASE_URL from environment (PostgreSQL / TimescaleDB).
# Defaults to local SQLite file for standalone local development.
# -----------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cybernova.db")

# Ensure PostgreSQL connection string compatibility with modern SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    # TimescaleDB / PostgreSQL production engine configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,      # Tests connection liveness before checkout
        pool_size=10,            # Base connection pool
        max_overflow=20          # Allows bursting for high-concurrency simulation runs
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()