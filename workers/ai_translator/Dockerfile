# Builder
FROM python:3.11-slim AS builder

WORKDIR /app

RUN pip install poetry

COPY workers/ai_translator/pyproject.toml ./pyproject.toml
COPY workers/ai_translator/poetry.lock* ./

RUN poetry config virtualenvs.create false && \
    poetry install --no-interaction --no-ansi --no-root

# Runner
FROM python:3.11-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y build-essential curl libpq-dev

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY workers ./workers
COPY shared ./shared

RUN useradd -m appuser && chown -R appuser /app
USER appuser

CMD ["celery", "-A", "shared.celery.app:celery_app", "worker", "--loglevel=info", "-Q", "translator"]