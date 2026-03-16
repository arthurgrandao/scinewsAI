import os
from dataclasses import dataclass


@dataclass(frozen=True)
class CelerySettings:
    broker_url: str
    result_backend: str
    timezone: str
    scraper_queue: str
    translator_queue: str
    daily_scrape_task: str

    @classmethod
    def from_env(cls) -> "CelerySettings":
        return cls(
            broker_url=os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//"),
            result_backend=os.getenv("CELERY_RESULT_BACKEND", "rpc://"),
            timezone=os.getenv("CELERY_TIMEZONE", "America/Sao_Paulo"),
            scraper_queue=os.getenv("CELERY_QUEUE_SCRAPER", "scraper"),
            translator_queue=os.getenv("CELERY_QUEUE_TRANSLATOR", "translator"),
            daily_scrape_task=os.getenv(
                "CELERY_DAILY_SCRAPE_TASK",
                "workers.paper_scraper.celery_tasks.run_curation_pipeline_task",
            ),
        )
