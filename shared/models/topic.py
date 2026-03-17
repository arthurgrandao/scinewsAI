from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from shared.db.database import Base


class Topic(Base):
    __tablename__ = "topics"

    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(255), primary_key=True, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)

    # Relationships
    subscriptions = relationship("Subscription", back_populates="topic", cascade="all, delete-orphan")
