from shared.models.article import Article


def insert_article(session_db, article_payload):
    """Insert article using the Article model and return True when a new row is created."""
    article = Article(**article_payload)
    session_db.add(article)
    try:
        session_db.commit()
        return True
    except Exception as e:
        session_db.rollback()
        return False
