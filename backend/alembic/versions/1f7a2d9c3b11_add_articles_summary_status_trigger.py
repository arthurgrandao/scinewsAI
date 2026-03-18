"""add articles summary status trigger

Revision ID: 1f7a2d9c3b11
Revises: 8c29b1fcc46b
Create Date: 2026-03-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "1f7a2d9c3b11"
down_revision: Union[str, Sequence[str], None] = "8c29b1fcc46b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION update_articles_processing_status_from_summaries()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.simplified_text_beginner IS NOT NULL
               AND NEW.simplified_text_intermediate IS NOT NULL
               AND NEW.simplified_text_advanced IS NOT NULL THEN
                NEW.processing_status = 'translated';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )

    op.execute(
        """
        CREATE TRIGGER update_articles_processing_status_from_summaries
        BEFORE INSERT OR UPDATE OF simplified_text_beginner, simplified_text_intermediate, simplified_text_advanced
        ON articles
        FOR EACH ROW EXECUTE FUNCTION update_articles_processing_status_from_summaries();
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP TRIGGER IF EXISTS update_articles_processing_status_from_summaries ON articles;"
    )
    op.execute(
        "DROP FUNCTION IF EXISTS update_articles_processing_status_from_summaries();"
    )
