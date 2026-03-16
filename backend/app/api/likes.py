from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from shared.db.database import get_db
from shared.models.like import Like
from shared.models.article import Article
from app.schemas.like import LikeResponse, LikeCountResponse
from app.core.security import get_current_user

router = APIRouter()


@router.post("/articles/{article_id}/like/", response_model=LikeResponse)
async def like_article(
    article_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Like an article"""
    user_id = current_user["user_id"]

    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artigo não encontrado")

    existing_like = db.query(Like).filter(Like.user_id == user_id, Like.article_id == article_id).first()
    if existing_like:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Você já curtiu este artigo")

    like = Like(user_id=user_id, article_id=article_id)
    db.add(like)
    db.commit()
    db.refresh(like)
    return like


@router.delete("/articles/{article_id}/like/", status_code=status.HTTP_204_NO_CONTENT)
async def unlike_article(
    article_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unlike an article"""
    user_id = current_user["user_id"]

    like = db.query(Like).filter(Like.user_id == user_id, Like.article_id == article_id).first()
    if not like:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Você não havia curtido este artigo")

    db.delete(like)
    db.commit()


@router.get("/articles/{article_id}/like-status/", response_model=LikeCountResponse)
async def get_like_status(
    article_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get like count and user's like status for an article"""
    user_id = current_user["user_id"]

    like_count = db.query(Like).filter(Like.article_id == article_id).count()
    is_liked = db.query(Like).filter(Like.user_id == user_id, Like.article_id == article_id).first() is not None

    return LikeCountResponse(article_id=article_id, like_count=like_count, is_liked=is_liked)


@router.get("/articles/{article_id}/likes/", response_model=LikeCountResponse)
async def get_like_count_public(article_id: str, db: Session = Depends(get_db)):
    """Get like count for an article (public endpoint)"""
    like_count = db.query(Like).filter(Like.article_id == article_id).count()
    return LikeCountResponse(article_id=article_id, like_count=like_count, is_liked=False)


@router.get("/users/me/likes/", response_model=dict)
async def get_user_likes(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all articles liked by the current user"""
    user_id = current_user["user_id"]

    likes = db.query(Like).filter(Like.user_id == user_id).all()
    liked_article_ids = [like.article_id for like in likes]
    return {"liked_articles": liked_article_ids, "count": len(liked_article_ids)}
