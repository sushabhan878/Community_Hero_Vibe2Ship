from datetime import datetime

from pydantic import BaseModel


class ProfileBrief(BaseModel):
    id: str
    name: str
    role: str
    hero_score: int
    avatar_url: str | None = None
    department_id: str | None = None


class BadgeOut(BaseModel):
    slug: str
    awarded_at: datetime


class DepartmentOut(BaseModel):
    id: str
    name: str
    slug: str


class ProfileOut(BaseModel):
    id: str
    name: str
    email: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    role: str
    hero_score: int
    total_reports: int
    total_resolved: int
    total_verified: int
    badges: list[BadgeOut] = []
    department: DepartmentOut | None = None


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    phone: str | None = None


class PushTokenRequest(BaseModel):
    token: str
    platform: str


class CreateDeptAdminRequest(BaseModel):
    email: str
    name: str
    department_id: str


class ToggleUserRequest(BaseModel):
    user_id: str
    is_active: bool
