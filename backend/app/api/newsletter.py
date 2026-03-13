from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.article import Article
from app.models.topic import Topic
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.article import ArticleResponse

router = APIRouter()


@router.get("/weekly-digest")
async def get_weekly_digest(db: Session = Depends(get_db)):
    """
    Get articles for weekly newsletter digest
    Called by n8n workflow
    """
    one_week_ago = datetime.utcnow() - timedelta(days=7)

    try:
        articles = (
            db.query(Article)
            .filter(Article.processing_status == "completed", Article.created_at >= one_week_ago)
            .order_by(Article.created_at.desc())
            .limit(20)
            .all()
        )
        return {
            "articles": [ArticleResponse.model_validate(a) for a in articles],
            "total": len(articles),
            "week_start": one_week_ago.isoformat(),
            "week_end": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch digest: {str(e)}")


@router.get("/article/{article_id}/subscribers")
async def get_article_subscribers(article_id: str, db: Session = Depends(get_db)):
    """
    Get list of subscribers interested in an article's topics
    Called by n8n workflow for notifications
    """
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    keywords = article.keywords or []
    if not keywords:
        return {"subscribers": [], "article_id": article_id}

    topic_ids = [t.id for t in db.query(Topic).filter(Topic.slug.in_(keywords)).all()]
    if not topic_ids:
        return {"subscribers": [], "article_id": article_id}

    user_ids = list({
        sub.user_id
        for sub in db.query(Subscription).filter(Subscription.topic_id.in_(topic_ids)).all()
    })
    if not user_ids:
        return {"subscribers": [], "article_id": article_id}

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    subscribers = [
        {
            "user_id": str(user.id),
            "email": user.email,
            "name": user.name,
            "profile_type": user.profile_type,
        }
        for user in users
    ]

    return {
        "article_id": article_id,
        "article_title": article.title,
        "subscribers": subscribers,
        "total": len(subscribers),
    }


@router.get("/social-post/{article_id}")
async def get_social_post_content(article_id: str, db: Session = Depends(get_db)):
    """
    Get formatted content for social media posting
    Called by n8n workflow for Twitter/LinkedIn
    """
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")

    base_url = "https://scinewsai.com/article"
    abstract = article.abstract or ""
    abstract_short = abstract[:200] + "..." if len(abstract) > 200 else abstract

    return {
        "article_id": article.id,
        "title": article.title,
        "abstract": abstract_short,
        "url": f"{base_url}/{article.id}",
        "source_url": article.source_url,
        "keywords": article.keywords or [],
        "twitter_format": f"📚 New research simplified!\n\n{article.title[:200]}\n\nRead the simplified version: {base_url}/{article.id}\n\n#Research #ComputerScience #AI",
        "linkedin_format": f"🔬 Latest Research Insight\n\n{article.title}\n\n{abstract[:300]}...\n\nRead the full simplified analysis: {base_url}/{article.id}\n\n#Research #Technology #Innovation",
    }
