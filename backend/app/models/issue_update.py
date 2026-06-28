import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class IssueUpdate(Base):
    __tablename__ = "issue_updates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    issue_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    updated_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    old_status: Mapped[str | None] = mapped_column(String, nullable=True)
    new_status: Mapped[str | None] = mapped_column(String, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra_meta: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        CheckConstraint("char_length(note) <= 500", name="note_length_check"),
    )

    issue = relationship("Issue", back_populates="updates")
