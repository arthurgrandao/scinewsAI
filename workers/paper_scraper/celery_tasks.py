from shared.celery.app import celery_app


@celery_app.task(
    bind=True,
    name="workers.paper_scraper.celery_tasks.run_curation_pipeline_task",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def run_curation_pipeline_task(self):
    """Run the scraper pipeline and return a simple execution summary."""
    # Import lazily so other workers can discover this task module
    # without requiring scraper-only dependencies at startup.
    from workers.paper_scraper.modules.pipeline import run_curation_pipeline

    run_curation_pipeline()
    return {"status": "ok"}
