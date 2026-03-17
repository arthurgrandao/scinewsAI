from sqlalchemy import text


INSERT_ARTICLE_STMT = text(
    """
    INSERT INTO articles (
        id,
        title,
        authors,
        publication_date,
        abstract,
        keywords,
        full_text,
        source_url,
        original_pdf_path,
        processing_status,
        relevance_score
    )
    VALUES (
        :id,
        :title,
        :authors,
        :publication_date,
        :abstract,
        :keywords,
        :full_text,
        :source_url,
        :original_pdf_path,
        :processing_status,
        :relevance_score
    )
    ON CONFLICT (id) DO NOTHING;
    """
)


def insert_article(session_db, article_payload):
    """Insert article and return True when a new row is created."""
    result = session_db.execute(INSERT_ARTICLE_STMT, article_payload)
    session_db.commit()
    return bool(result.rowcount and result.rowcount > 0)
