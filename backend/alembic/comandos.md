
# alembic — comandos

**Legenda:** comandos rápidos para gerenciar migrações Alembic (Docker e local).

## Docker Compose

Gerar migration autogerada:

```bash
docker compose run --rm backend alembic -c alembic.ini revision --autogenerate -m "mensagem"
```

Criar revision manual (vazia):

```bash
docker compose run --rm backend alembic -c alembic.ini revision -m "mensagem"
```

Aplicar migrações (upgrade para head):

```bash
docker compose run --rm backend alembic -c alembic.ini upgrade head
```

Ver versão atual do banco:

```bash
docker compose run --rm backend alembic -c alembic.ini current
```

Histórico de migrations:

```bash
docker compose run --rm backend alembic -c alembic.ini history --verbose
```

Reverter 1 migration:

```bash
docker compose run --rm backend alembic -c alembic.ini downgrade -1
```

## Local (sem Docker)

Gerar migration autogerada:

```bash
alembic -c alembic.ini revision --autogenerate -m "mensagem"
```

Criar revision manual (vazia):

```bash
alembic -c alembic.ini revision -m "mensagem"
```

Aplicar migrações (upgrade para head):

```bash
alembic -c alembic.ini upgrade head
```

Ver versão atual do banco:

```bash
alembic -c alembic.ini current
```

Histórico de migrations:

```bash
alembic -c alembic.ini history --verbose
```

Reverter 1 migration:

```bash
alembic -c alembic.ini downgrade -1
```

