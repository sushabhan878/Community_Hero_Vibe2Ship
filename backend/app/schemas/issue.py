from datetime import datetime

from pydantic import BaseModel, field_validator


class CreateIssueRequest(BaseModel):
    title: str
    description: str | None = None
    category: str = "other"
    severity: str = "medium"
    latitude: float
    longitude: float
    address: str | None = None
    ward: str | None = None
    image_urls: list[str] = []
    video_url: str | None = None

    @field_validator("title")
    @classmethod
    def title_length(cls, v: str) -> str:
        if len(v) < 5 or len(v) > 100:
            raise ValueError("Title must be between 5 and 100 characters")
        return v

    @field_validator("description")
    @classmethod
    def description_length(cls, v: str | None) -> str | None:
        if v and len(v) > 1000:
            raise ValueError("Description must not exceed 1000 characters")
        return v

    @field_validator("latitude")
    @classmethod
    def valid_lat(cls, v: float) -> float:
        if v < -90 or v > 90:
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def valid_lng(cls, v: float) -> float:
        if v < -180 or v > 180:
            raise ValueError("Longitude must be between -180 and 180")
        return v


class UpdateIssueRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    severity: str | None = None


class IssueListParams(BaseModel):
    page: int = 1
    limit: int = 20
    status: str | None = None
    category: str | None = None
    severity: str | None = None
    department_id: str | None = None
    reporter_id: str | None = None
    lat: float | None = None
    lng: float | None = None
    radius_km: float = 5
    sort: str = "newest"
    search: str | None = None


class ReporterOut(BaseModel):
    id: str
    name: str
    avatar_url: str | None = None
    hero_score: int | None = None


class TimelineEntry(BaseModel):
    type: str
    old_status: str | None = None
    new_status: str | None = None
    note: str | None = None
    created_at: datetime


class IssueOut(BaseModel):
    id: str
    title: str
    description: str | None = None
    category: str
    severity: str
    ai_category: str | None = None
    ai_severity: str | None = None
    ai_summary: str | None = None
    ai_confidence: float | None = None
    status: str
    latitude: float
    longitude: float
    address: str | None = None
    image_urls: list[str] = []
    video_url: str | None = None
    upvote_count: int = 0
    verification_count: int = 0
    reporter: ReporterOut | None = None
    assigned_department: "DepartmentOut | None" = None
    has_verified: bool = False
    timeline: list[TimelineEntry] = []
    created_at: datetime
    updated_at: datetime


class IssueListItem(BaseModel):
    id: str
    title: str
    category: str
    severity: str
    status: str
    latitude: float
    longitude: float
    address: str | None = None
    upvote_count: int
    verification_count: int
    image_urls: list[str] = []
    ai_summary: str | None = None
    reporter: ReporterOut | None = None
    has_verified: bool = False
    created_at: datetime


class IssueListOut(BaseModel):
    issues: list[IssueListItem]
    pagination: "Pagination"


class NearbyMarker(BaseModel):
    id: str
    latitude: float
    longitude: float
    category: str
    severity: str
    status: str


class NearbyIssuesOut(BaseModel):
    markers: list[NearbyMarker]


class MediaUploadOut(BaseModel):
    image_urls: list[str] = []
    video_url: str | None = None


class SignedUrlsRequest(BaseModel):
    paths: list[str]


class SignedUrlsOut(BaseModel):
    urls: dict[str, str]


from app.schemas.common import Pagination
from app.schemas.profile import DepartmentOut
IssueOut.model_rebuild()
IssueListOut.model_rebuild()
