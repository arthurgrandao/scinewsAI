from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.database import get_db
from app.models.article import Article
from app.schemas.article import ArticleResponse, ArticleListResponse
from app.core.security import get_current_user

router = APIRouter()


@router.get("/", response_model=ArticleListResponse)
async def list_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    topic: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all articles with pagination and filtering"""
    try:
        query = db.query(Article).filter(Article.processing_status == "translated")

        if search:
            query = query.filter(
                or_(
                    Article.title.ilike(f"%{search}%"),
                    Article.abstract.ilike(f"%{search}%"),
                )
            )

        total = query.count()
        offset = (page - 1) * page_size
        articles = query.order_by(Article.publication_date.desc()).offset(offset).limit(page_size).all()

        return ArticleListResponse(
            articles=[ArticleResponse.model_validate(a) for a in articles],
            total=total,
            page=page,
            page_size=page_size,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch articles: {str(e)}")


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a specific article by ID"""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return ArticleResponse.model_validate(article)


@router.get("/latest/", response_model=List[ArticleResponse])
async def get_latest_articles(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Get latest articles (public endpoint for newsletter)"""
    try:
        articles = (
            db.query(Article)
            .filter(Article.processing_status == "completed")
            .order_by(Article.publication_date.desc())
            .limit(limit)
            .all()
        )
        return [ArticleResponse.model_validate(a) for a in articles]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch articles: {str(e)}")


@router.get("/subscribed/feed", response_model=ArticleListResponse)
async def get_subscribed_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    subscribed_only: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get articles (all or from subscribed topics only) for the current user"""
    try:
        query = db.query(Article).filter(Article.processing_status == "translated")

        if search:
            query = query.filter(
                or_(
                    Article.title.ilike(f"%{search}%"),
                    Article.abstract.ilike(f"%{search}%"),
                )
            )

        total = query.count()
        offset = (page - 1) * page_size
        articles = query.order_by(Article.publication_date.desc()).offset(offset).limit(page_size).all()

        return ArticleListResponse(
            articles=[ArticleResponse.model_validate(a) for a in articles],
            total=total,
            page=page,
            page_size=page_size,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch articles: {str(e)}")
