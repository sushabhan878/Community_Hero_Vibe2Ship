from datetime import datetime

from pydantic import BaseModel


class VerificationUser(BaseModel):
    id: str
    name: str
    avatar_url: str | None = None


class VerificationEntry(BaseModel):
    user: VerificationUser
    created_at: datetime


class VerificationListOut(BaseModel):
    verifications: list[VerificationEntry]
    total: int
    has_verified: bool


class VerificationResponse(BaseModel):
    verification_count: int
    has_verified: bool
    status: str
    hero_points_earned: int = 0
