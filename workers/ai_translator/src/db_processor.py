import logging
import time
from sqlalchemy import select, and_, or_
from shared.db.database import Base, SessionLocal, engine
from shared.models.article import Article
from .rag import translate_text

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


SUMMARY_LEVELS = ("BEGINNER", "INTERMEDIATE", "ADVANCED")
SUMMARY_FIELD_BY_LEVEL = {
    "BEGINNER": "simplified_text_beginner",
    "INTERMEDIATE": "simplified_text_intermediate",
    "ADVANCED": "simplified_text_advanced",
}
LLM_SLEEP_SECONDS = 22


def process_article(article_id: str) -> dict:
    """Process a single article by id and update its translation fields."""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        article = session.get(Article, article_id)
        if article is None:
            logger.warning("Article %s not found", article_id)
            return {"status": "not_found", "article_id": article_id}

        if article.full_text is None:
            logger.warning("Article %s has no full_text", article_id)
            return {"status": "missing_full_text", "article_id": article_id}

        has_all_summaries = all(
            getattr(article, SUMMARY_FIELD_BY_LEVEL[level])
            for level in SUMMARY_LEVELS
        )
        if has_all_summaries:
            logger.info("Article %s already translated, skipping", article_id)
            return {"status": "already_translated", "article_id": article_id}

        start_time = time.time()
        article.processing_status = "translating"
        session.commit()

        for index, level in enumerate(SUMMARY_LEVELS):
            translated_content = translate_text(article.full_text, level=level)
            setattr(article, SUMMARY_FIELD_BY_LEVEL[level], translated_content)

            if index < len(SUMMARY_LEVELS) - 1:
                logger.info(
                    "Sleeping %ss before next LLM request for article %s",
                    LLM_SLEEP_SECONDS,
                    article_id,
                )
                time.sleep(LLM_SLEEP_SECONDS)

        session.commit()

        elapsed = time.time() - start_time
        logger.info("Successfully processed article %s in %.2fs", article_id, elapsed)
        return {"status": "translated", "article_id": article_id, "elapsed_seconds": elapsed}
    except Exception as exc:
        logger.error("Error processing article %s: %s", article_id, exc)
        session.rollback()
        article = session.get(Article, article_id)
        if article is not None:
            article.processing_status = "failed_translation"
            session.commit()
        raise
    finally:
        session.close()

def process_articles(loop: bool = False, sleep_interval: int = 60):
    """
    Fetches articles from DB with pending level summaries and full_text available,
    translates them, and saves back to DB.
    """
    logger.info("Starting article processing service...")
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized.")
    
    while True:
        session = SessionLocal()
        try:
            # Query for articles that need processing
            stmt = select(Article).where(
                and_(
                    or_(
                        Article.simplified_text_beginner.is_(None),
                        Article.simplified_text_intermediate.is_(None),
                        Article.simplified_text_advanced.is_(None),
                    ),
                    Article.full_text.is_not(None)
                )
            )
            
            result = session.execute(stmt)
            articles = result.scalars().all()
            
            if articles:
                logger.info(f"Found {len(articles)} articles to process.")
                
                for article in articles:
                    logger.info(f"Processing article ID: {article.id} - Title: {article.title[:50]}...")
                    process_article(article.id)
            else:
                if loop:
                    logger.debug(f"No pending articles. Sleeping for {sleep_interval}s...")
            
        except Exception as e:
            logger.error(f"Database error: {e}")
        finally:
            session.close()

        if not loop:
            break
            
        time.sleep(sleep_interval)

if __name__ == "__main__":
    process_articles()
