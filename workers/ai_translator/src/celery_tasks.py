from shared.celery.app import celery_app

from .db_processor import process_article, process_articles


@celery_app.task(
    bind=True,
    name="workers.ai_translator.src.celery_tasks.process_article_task",
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
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def process_pending_articles_task(self):
    """Process pending article translations once."""
    process_articles(loop=False)
    return {"status": "ok"}
