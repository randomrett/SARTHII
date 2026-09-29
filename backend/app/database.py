from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

from sqlalchemy.engine import URL
from urllib.parse import unquote

def sanitize_db_url(url_str: str):
    if not url_str or isinstance(url_str, URL) or url_str.startswith("sqlite"):
        return url_str
    
    scheme = "postgresql+psycopg2"
    if "://" in url_str:
        s, rest = url_str.split("://", 1)
        if s in ("postgres", "postgresql", "postgresql+psycopg2", "postgresql+psycopg"):
            scheme = "postgresql+psycopg2"
        else:
            scheme = s
    else:
        rest = url_str

    if "@" in rest:
        last_at = rest.rfind("@")
        userinfo = rest[:last_at]
        hostinfo = rest[last_at + 1:]

        user = ""
        password = ""
        if ":" in userinfo:
            user, password = userinfo.split(":", 1)
            password = unquote(password)
        else:
            user = unquote(userinfo)

        host = hostinfo
        port = 5432
        database = "postgres"

        if "/" in hostinfo:
            host_port, database = hostinfo.split("/", 1)
            if "?" in database:
                database = database.split("?", 1)[0]
        else:
            host_port = hostinfo

        if ":" in host_port:
            host, port_str = host_port.split(":", 1)
            try:
                port = int(port_str)
            except ValueError:
                port = 5432

        return URL.create(
            drivername=scheme,
            username=user,
            password=password,
            host=host,
            port=port,
            database=database
        )
    return url_str

db_url = sanitize_db_url(settings.DATABASE_URL)

connect_args = {}
if isinstance(db_url, str) and db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine_kwargs = {"connect_args": connect_args}
if not (isinstance(db_url, str) and db_url.startswith("sqlite")):
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
