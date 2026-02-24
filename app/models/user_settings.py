from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from .base import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    default_currency = Column(String(3), nullable=False, default="USD")
    home_base = Column(Text)
    feature_flags = Column(JSON, nullable=False, default="{}")
