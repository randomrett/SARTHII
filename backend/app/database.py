from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

from urllib.parse import unquote, quote_plus

def sanitize_db_url(url: str) -> str:
    if not url or url.startswith("sqlite"):
        return url
    
    # Strip any dialect prefix to get clean postgresql://
    for prefix in ("postgres://", "postgresql+psycopg2://", "postgresql+psycopg://"):
        if url.startswith(prefix):
            url = "postgresql://" + url[len(prefix):]
            break

    # Dynamically select dialect scheme based on available DB driver in environment
    try:
        import psycopg
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    except ImportError:
        try:
            import psycopg2
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        except ImportError:
            pass

    try:
        if "://" in url:
            scheme, rest = url.split("://", 1)
            if "@" in rest:
                last_at = rest.rfind("@")
                userinfo = rest[:last_at]
                hostinfo = rest[last_at + 1:]
                if ":" in userinfo:
                    user, password = userinfo.split(":", 1)
                    raw_pass = unquote(password)
                    enc_pass = quote_plus(raw_pass)
                    return f"{scheme}://{user}:{enc_pass}@{hostinfo}"
    except Exception:
        pass
    return url


db_url = sanitize_db_url(settings.DATABASE_URL)

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine_kwargs = {"connect_args": connect_args}
if not db_url.startswith("sqlite"):
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(db_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
