from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from shared.db.database import get_db
from shared.models.user import User
from shared.models.topic import Topic
from shared.models.subscription import Subscription
from app.schemas.user import UserResponse, UserUpdate
from app.core.security import get_current_user

router = APIRouter()


@router.get("/me/", response_model=UserResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user info"""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    subscribed_topic_ids = [str(sub.topic_id) for sub in user.subscriptions]

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        profile_type=user.profile_type,
        subscribed_topics=subscribed_topic_ids,
        created_at=user.created_at,
    )


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    updates: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update user profile"""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not updates.name and not updates.profile_type:
        raise HTTPException(status_code=400, detail="No fields to update")

    if updates.name:
        user.name = updates.name
    if updates.profile_type:
        user.profile_type = updates.profile_type

    db.commit()
    db.refresh(user)

    subscribed_topic_ids = [str(sub.topic_id) for sub in user.subscriptions]

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        profile_type=user.profile_type,
        subscribed_topics=subscribed_topic_ids,
        created_at=user.created_at,
    )


@router.delete("/")
async def delete_account(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete user account"""
    user = db.query(User).filter(User.id == current_user["user_id"]).first()
    if user:
        db.delete(user)
        db.commit()
    return {"message": "Account deleted successfully"}


@router.post("/me/topics/{topic_id}/subscribe/", response_model=UserResponse)
async def subscribe_to_topic(
    topic_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Subscribe user to a topic"""
    user_id = current_user["user_id"]

    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    existing = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.topic_id == topic_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already subscribed to this topic")

    subscription = Subscription(user_id=user_id, topic_id=topic_id)
    db.add(subscription)
    db.commit()

    user = db.query(User).filter(User.id == user_id).first()
    subscribed_topic_ids = [str(sub.topic_id) for sub in user.subscriptions]

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        profile_type=user.profile_type,
        subscribed_topics=subscribed_topic_ids,
        created_at=user.created_at,
    )


@router.delete("/me/topics/{topic_id}/subscribe/", response_model=UserResponse)
async def unsubscribe_from_topic(
    topic_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unsubscribe user from a topic"""
    user_id = current_user["user_id"]

    sub = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.topic_id == topic_id,
    ).first()
    if sub:
        db.delete(sub)
        db.commit()

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    subscribed_topic_ids = [str(sub.topic_id) for sub in user.subscriptions]

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        profile_type=user.profile_type,
        subscribed_topics=subscribed_topic_ids,
        created_at=user.created_at,
    )
