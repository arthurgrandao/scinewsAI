from datetime import date

from shared.celery.app import celery_app
from shared.config.celery import CelerySettings
from shared.db.database import SessionLocal
from shared.models.article import Article

from .db_processor import process_article, process_articles


PROCESS_ARTICLE_TASK_NAME = "workers.ai_translator.src.celery_tasks.process_article_task"
MOCK_ARTICLE_ID = "mock-ai-translator-article"
CELERY_SETTINGS = CelerySettings.from_env()


def _upsert_mock_article() -> str:
    session = SessionLocal()
    try:
        article = session.get(Article, MOCK_ARTICLE_ID)
        if article is None:
            article = Article(
                id=MOCK_ARTICLE_ID,
                title="Mock Article: Multi-Level Scientific Summary",
                authors=["SciNewsAI Bot"],
                publication_date=date.today(),
                abstract=(
                    "Artigo mockado para validar a geracao de resumos em tres niveis "
                    "de complexidade usando o worker ai_translator."
                ),
                keywords=["mock", "ai-translator", "summaries"],
                source_url="https://example.com/mock-ai-translator-article",
            )
            session.add(article)

        article.full_text = (
            "Este e um texto de exemplo para validar o pipeline de traducao e simplificacao. "
            "O estudo investiga como modelos de linguagem podem produzir explicacoes em "
            "diferentes niveis de profundidade. Foram comparadas estrategias de prompting, "
            "avaliadas por clareza, fidelidade e utilidade pedagogica. Os resultados indicam "
            "que separar explicitamente os niveis BEGINNER, INTERMEDIATE e ADVANCED melhora "
            "a adequacao do texto para diferentes perfis de leitor sem perder consistencia "
            "tecnica. Tambem foi observado que o controle de taxa de requisicoes reduz falhas "
            "por limite de API, com pequeno aumento de latencia total por artigo."
        )
        article.processing_status = "parsed"
        article.simplified_text_beginner = None
        article.simplified_text_intermediate = None
        article.simplified_text_advanced = None
        session.commit()
        return article.id
    finally:
        session.close()


@celery_app.task(
    bind=True,
    name="workers.ai_translator.src.celery_tasks.process_article_task",
    queue=CELERY_SETTINGS.translator_queue,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def process_article_task(self, article_id: str):
    """Process one specific article by id."""
    return process_article(article_id)


@celery_app.task(
    bind=True,
    name="workers.ai_translator.src.celery_tasks.process_pending_articles_task",
    queue=CELERY_SETTINGS.translator_queue,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def process_pending_articles_task(self):
    """Process pending article translations once."""
    process_articles(loop=False)
    return {"status": "ok"}


@celery_app.task(
    bind=True,
    name="workers.ai_translator.src.celery_tasks.enqueue_mock_article_translation_task",
    queue=CELERY_SETTINGS.translator_queue,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def enqueue_mock_article_translation_task(self):
    """Create/update a mock article and enqueue it for translator processing."""
    article_id = _upsert_mock_article()

    async_result = celery_app.send_task(
        PROCESS_ARTICLE_TASK_NAME,
        args=[article_id],
        queue=CELERY_SETTINGS.translator_queue,
    )
    return {
        "status": "queued",
        "article_id": article_id,
        "queued_task_id": async_result.id,
        "queue": CELERY_SETTINGS.translator_queue,
    }
