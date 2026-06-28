import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default="citizen")
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    hero_score: Mapped[int] = mapped_column(Integer, default=0)
    total_reports: Mapped[int] = mapped_column(Integer, default=0)
    total_resolved: Mapped[int] = mapped_column(Integer, default=0)
    total_verified: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("role != 'department_admin' OR department_id IS NOT NULL", name="dept_admin_needs_dept"),
    )

    department = relationship("Department", back_populates="profiles")
    reported_issues = relationship("Issue", back_populates="reporter", foreign_keys="Issue.reporter_id")
    verifications = relationship("Verification", back_populates="user")
    badges = relationship("Badge", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    push_tokens = relationship("PushToken", back_populates="user")
