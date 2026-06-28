import uuid
from datetime import datetime, timezone

from geoalchemy2 import Geography
from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    reporter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)

    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_urls: Mapped[list] = mapped_column(ARRAY(String), default=list, nullable=False)
    video_url: Mapped[str | None] = mapped_column(String, nullable=True)

    category: Mapped[str] = mapped_column(String, nullable=False, default="other")
    severity: Mapped[str] = mapped_column(String, nullable=False, default="medium")

    ai_category: Mapped[str | None] = mapped_column(String, nullable=True)
    ai_severity: Mapped[str | None] = mapped_column(String, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Numeric(4, 3), nullable=True)
    ai_is_duplicate: Mapped[bool | None] = mapped_column(Boolean, default=False)
    ai_duplicate_of: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("issues.id"), nullable=True
    )
    ai_processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    latitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(10, 7), nullable=False)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    ward: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)

    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    assigned_department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("departments.id"), nullable=True
    )
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    upvote_count: Mapped[int] = mapped_column(Integer, default=0)
    verification_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("char_length(title) BETWEEN 5 AND 100", name="title_length_check"),
        CheckConstraint("char_length(description) <= 1000", name="description_length_check"),
    )

    reporter = relationship("Profile", back_populates="reported_issues", foreign_keys=[reporter_id])
    assigned_department = relationship("Department", back_populates="issues")
    verifications = relationship("Verification", back_populates="issue")
    updates = relationship("IssueUpdate", back_populates="issue")
    duplicate_of = relationship("Issue", remote_side="Issue.id", foreign_keys=[ai_duplicate_of])
