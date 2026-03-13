from __future__ import with_statement
import sys
import os
from logging.config import fileConfig

from sqlalchemy import pool

from alembic import context

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# Import the application's settings and metadata
from app.core.config import Settings
from app.db.database import Base, engine as db_engine

# Import all models to ensure they are registered with SQLAlchemy's metadata
import pkgutil
import importlib
import app.models as models

for _, module_name, _ in pkgutil.iter_modules(models.__path__):
    importlib.import_module(f"app.models.{module_name}")

settings = Settings()

# Provide the metadata for 'autogenerate' support
target_metadata = Base.metadata


def get_url():
    return settings.DATABASE_URL


def run_migrations_offline():
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    # Use the application's SQLAlchemy engine so Alembic runs with the
    # same connection URL and engine configuration used by the app.
    connectable = db_engine

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
