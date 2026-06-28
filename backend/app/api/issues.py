import math
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_profile, require_role
from app.config import settings
from app.core.exceptions import AppException, NotFound, RateLimited, ValidationError
from app.database import get_db
from app.models.issue import Issue
from app.models.issue_update import IssueUpdate
from app.models.profile import Profile
from app.models.verification import Verification
from app.schemas.common import Pagination
from app.schemas.issue import (
    CreateIssueRequest,
    IssueListItem,
    IssueListOut,
    IssueListParams,
    IssueOut,
    MediaUploadOut,
    NearbyIssuesOut,
    NearbyMarker,
    ReporterOut,
    SignedUrlsOut,
    SignedUrlsRequest,
    TimelineEntry,
    UpdateIssueRequest,
)
from app.schemas.profile import DepartmentOut

router = APIRouter(prefix="/issues", tags=["issues"])


@router.post("/upload-media")
async def upload_media():
    return MediaUploadOut()


@router.post("")
async def create_issue(
    body: CreateIssueRequest,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(
        select(func.count()).select_from(Issue).where(
            Issue.reporter_id == profile.id,
            Issue.created_at > datetime.now(timezone.utc) - timedelta(hours=24),
        )
    )
    recent_count = count_result.scalar()
    if recent_count and recent_count >= settings.RATE_LIMIT_ISSUES_PER_24H:
        raise RateLimited()

    issue = Issue(
        reporter_id=profile.id,
        title=body.title,
        description=body.description,
        category=body.category,
        severity=body.severity,
        latitude=body.latitude,
        longitude=body.longitude,
        address=body.address,
        ward=body.ward,
        image_urls=body.image_urls,
        video_url=body.video_url,
        status="pending",
    )
    db.add(issue)
    await db.flush()

    audit = IssueUpdate(
        issue_id=issue.id,
        updated_by=profile.id,
        type="status_change",
        new_status="pending",
    )
    db.add(audit)

    profile.total_reports += 1
    await db.commit()
    await db.refresh(issue)

    return {
        "success": True,
        "data": {
            "id": str(issue.id),
            "status": issue.status,
            "created_at": issue.created_at.isoformat(),
            "message": "Issue submitted. AI is analyzing your report.",
        },
    }


@router.get("")
async def list_issues(
    params: IssueListParams = Depends(),
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    query = select(Issue).options(
        selectinload(Issue.reporter),
        selectinload(Issue.assigned_department),
    ).where(Issue.deleted_at.is_(None))

    if params.status:
        statuses = [s.strip() for s in params.status.split(",")]
        query = query.where(Issue.status.in_(statuses))
    if params.category:
        query = query.where(Issue.category == params.category)
    if params.severity:
        query = query.where(Issue.severity == params.severity)
    if params.department_id:
        query = query.where(Issue.assigned_department_id == params.department_id)
    if params.reporter_id:
        query = query.where(Issue.reporter_id == params.reporter_id)
    if params.search:
        query = query.where(Issue.title.ilike(f"%{params.search}%"))

    if profile.role == "department_admin" and profile.department_id:
        query = query.where(Issue.assigned_department_id == profile.department_id)

    if params.sort == "newest":
        query = query.order_by(Issue.created_at.desc())
    elif params.sort == "most_verified":
        query = query.order_by(Issue.verification_count.desc())
    elif params.sort == "severity":
        severity_order = func.array_position(["critical", "high", "medium", "low"], Issue.severity)
        query = query.order_by(severity_order)

    total_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0

    offset = (params.page - 1) * params.limit
    query = query.offset(offset).limit(params.limit)
    result = await db.execute(query)
    issues = result.scalars().all()

    items = []
    for issue in issues:
        reporter = None
        if issue.reporter:
            reporter = ReporterOut(
                id=str(issue.reporter.id),
                name=issue.reporter.name,
                avatar_url=issue.reporter.avatar_url,
            )
        items.append(IssueListItem(
            id=str(issue.id),
            title=issue.title,
            category=issue.category,
            severity=issue.severity,
            status=issue.status,
            latitude=float(issue.latitude),
            longitude=float(issue.longitude),
            address=issue.address,
            upvote_count=issue.upvote_count,
            verification_count=issue.verification_count,
            image_urls=issue.image_urls or [],
            ai_summary=issue.ai_summary,
            reporter=reporter,
            created_at=issue.created_at,
        ))

    return IssueListOut(
        issues=items,
        pagination=Pagination(
            page=params.page,
            limit=params.limit,
            total=total,
            has_more=offset + params.limit < total,
        ),
    )


@router.get("/nearby")
async def nearby_issues(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(2, le=20),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Issue).where(
            Issue.deleted_at.is_(None),
            Issue.latitude.between(lat - 0.5, lat + 0.5),
            Issue.longitude.between(lng - 0.5, lng + 0.5),
        ).limit(100)
    )
    issues = result.scalars().all()

    markers = [
        NearbyMarker(
            id=str(i.id),
            latitude=float(i.latitude),
            longitude=float(i.longitude),
            category=i.category,
            severity=i.severity,
            status=i.status,
        )
        for i in issues
    ]
    return NearbyIssuesOut(markers=markers)


@router.get("/{issue_id}")
async def get_issue(
    issue_id: str,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Issue).options(
            selectinload(Issue.reporter),
            selectinload(Issue.assigned_department),
            selectinload(Issue.updates),
        ).where(Issue.id == issue_id, Issue.deleted_at.is_(None))
    )
    issue = result.scalar_one_or_none()
    if not issue:
        raise NotFound("Issue")

    verif_result = await db.execute(
        select(Verification).where(
            Verification.issue_id == issue.id,
            Verification.user_id == profile.id,
        )
    )
    has_verified = verif_result.scalar_one_or_none() is not None

    reporter = None
    if issue.reporter:
        reporter = ReporterOut(
            id=str(issue.reporter.id),
            name=issue.reporter.name,
            avatar_url=issue.reporter.avatar_url,
            hero_score=issue.reporter.hero_score,
        )

    department = None
    if issue.assigned_department:
        department = DepartmentOut(
            id=str(issue.assigned_department.id),
            name=issue.assigned_department.name,
            slug=issue.assigned_department.slug,
        )

    timeline = [
        TimelineEntry(
            type=u.type,
            old_status=u.old_status,
            new_status=u.new_status,
            note=u.note,
            created_at=u.created_at,
        )
        for u in sorted(issue.updates, key=lambda x: x.created_at)
    ]

    return IssueOut(
        id=str(issue.id),
        title=issue.title,
        description=issue.description,
        category=issue.category,
        severity=issue.severity,
        ai_category=issue.ai_category,
        ai_severity=issue.ai_severity,
        ai_summary=issue.ai_summary,
        ai_confidence=float(issue.ai_confidence) if issue.ai_confidence else None,
        status=issue.status,
        latitude=float(issue.latitude),
        longitude=float(issue.longitude),
        address=issue.address,
        image_urls=issue.image_urls or [],
        video_url=issue.video_url,
        upvote_count=issue.upvote_count,
        verification_count=issue.verification_count,
        reporter=reporter,
        assigned_department=department,
        has_verified=has_verified,
        timeline=timeline,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
    )


@router.patch("/{issue_id}")
async def update_issue(
    issue_id: str,
    body: UpdateIssueRequest,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.deleted_at.is_(None))
    )
    issue = result.scalar_one_or_none()
    if not issue:
        raise NotFound("Issue")

    if issue.reporter_id != profile.id:
        raise AppException("FORBIDDEN", "Only the reporter can edit this issue")

    if issue.status != "pending":
        raise AppException("INVALID_STATUS", "Can only edit issues in pending status")

    if body.title is not None:
        issue.title = body.title
    if body.description is not None:
        issue.description = body.description
    if body.category is not None:
        issue.category = body.category
    if body.severity is not None:
        issue.severity = body.severity

    audit = IssueUpdate(
        issue_id=issue.id,
        updated_by=profile.id,
        type="status_change",
        old_status=issue.status,
        new_status=issue.status,
        note="Issue updated by reporter",
    )
    db.add(audit)
    await db.commit()

    return {"success": True, "data": {"id": str(issue.id), "status": issue.status}}


@router.delete("/{issue_id}")
async def delete_issue(
    issue_id: str,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.deleted_at.is_(None))
    )
    issue = result.scalar_one_or_none()
    if not issue:
        raise NotFound("Issue")

    if profile.role != "super_admin":
        if issue.reporter_id != profile.id:
            raise AppException("FORBIDDEN", "Can only delete your own issues")
        if issue.status != "pending":
            raise AppException("INVALID_STATUS", "Can only delete pending issues")

    issue.deleted_at = datetime.now(timezone.utc)

    audit = IssueUpdate(
        issue_id=issue.id,
        updated_by=profile.id,
        type="status_change",
        old_status=issue.status,
        new_status=issue.status,
        note="Issue deleted",
    )
    db.add(audit)
    await db.commit()

    return {"success": True, "message": "Issue deleted"}


@router.post("/signed-urls")
async def get_signed_urls(body: SignedUrlsRequest):
    return SignedUrlsOut(urls={path: path for path in body.paths})
