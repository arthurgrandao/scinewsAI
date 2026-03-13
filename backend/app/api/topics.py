from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.topic import Topic
from app.models.subscription import Subscription
from app.schemas.topic import TopicResponse
from app.core.security import get_current_user

router = APIRouter()


@router.get("/", response_model=List[TopicResponse])
async def list_topics(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all available topics"""
    try:
        topics = db.query(Topic).order_by(Topic.name).all()
        return [TopicResponse.model_validate(t) for t in topics]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch topics: {str(e)}")


@router.post("/{topic_id}/subscribe")
async def subscribe_to_topic(
    topic_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Subscribe to a topic"""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    existing = db.query(Subscription).filter(
        Subscription.user_id == current_user["user_id"],
        Subscription.topic_id == topic_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already subscribed to this topic")

    subscription = Subscription(user_id=current_user["user_id"], topic_id=topic_id)
    db.add(subscription)
    db.commit()
    return {"message": "Successfully subscribed", "topic": topic.name}


@router.delete("/{topic_id}/unsubscribe")
async def unsubscribe_from_topic(
    topic_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unsubscribe from a topic"""
    sub = db.query(Subscription).filter(
        Subscription.user_id == current_user["user_id"],
        Subscription.topic_id == topic_id,
    ).first()
    if sub:
        db.delete(sub)
        db.commit()
    return {"message": "Successfully unsubscribed"}


@router.get("/subscriptions/", response_model=List[TopicResponse])
async def get_user_subscriptions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's topic subscriptions"""
    try:
        subscriptions = db.query(Subscription).filter(
            Subscription.user_id == current_user["user_id"]
        ).all()
        if not subscriptions:
            return []
        topic_ids = [sub.topic_id for sub in subscriptions]
        topics = db.query(Topic).filter(Topic.id.in_(topic_ids)).all()
        return [TopicResponse.model_validate(t) for t in topics]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch subscriptions: {str(e)}")
