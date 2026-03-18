from celery import Celery
from celery.schedules import crontab
from kombu import Queue

# from workers.paper_scraper.celery_tasks import run_curation_pipeline_task
# from workers.ai_translator.src.celery_tasks import process_article_task, process_pending_articles_task

from shared.config.celery import CelerySettings

settings = CelerySettings.from_env()

celery_app = Celery(
    "scinewsai",
    broker=settings.broker_url,
    backend=settings.result_backend,
)

celery_app.conf.update(
    timezone=settings.timezone,
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    task_default_queue=settings.scraper_queue,
    task_queues=(
        Queue(settings.scraper_queue),
        Queue(settings.translator_queue),
    ),
    beat_schedule={
        "daily-paper-scrape-0300": {
            "task": settings.daily_scrape_task,
            "schedule": crontab(hour=3, minute=0),
            "options": {"queue": settings.scraper_queue},
        }
        # "test-schedule": {
        #     "task": settings.daily_scrape_task,
        #     "schedule": crontab(minute="*/3"),
        #     "options": {"queue": settings.scraper_queue},
        # }
    },
)

celery_app.autodiscover_tasks(
    [
        "workers.paper_scraper",
        "workers.ai_translator.src",
    ],
    related_name="celery_tasks",
)
