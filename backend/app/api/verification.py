from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_profile
from app.config import settings
from app.core.exceptions import AppException, NotFound, RateLimited
from app.database import get_db
from app.models.issue import Issue
from app.models.issue_update import IssueUpdate
from app.models.profile import Profile
from app.models.verification import Verification
from app.schemas.verification import (
    VerificationEntry,
    VerificationListOut,
    VerificationResponse,
    VerificationUser,
)

router = APIRouter(tags=["verification"])


@router.post("/issues/{issue_id}/verify")
async def verify_issue(
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

    if issue.reporter_id == profile.id:
        raise AppException("CANNOT_VERIFY_OWN", "Cannot verify your own issue")

    if issue.status not in ("ai_processed", "verified"):
        raise AppException(
            "ISSUE_NOT_VERIFIABLE",
            "Can only verify issues in ai_processed or verified status",
        )

    existing = await db.execute(
        select(Verification).where(
            Verification.issue_id == issue.id,
            Verification.user_id == profile.id,
        )
    )
    if existing.scalar_one_or_none():
        raise AppException("ALREADY_VERIFIED", "You already verified this issue")

    rate_result = await db.execute(
        select(func.count()).select_from(Verification).where(
            Verification.user_id == profile.id,
            Verification.created_at > datetime.now(timezone.utc) - timedelta(hours=1),
        )
    )
    if rate_result.scalar() and rate_result.scalar() >= settings.RATE_LIMIT_VERIFICATIONS_PER_HOUR:
        raise RateLimited()

    verification = Verification(issue_id=issue.id, user_id=profile.id)
    db.add(verification)

    issue.verification_count += 1
    profile.total_verified += 1
    profile.hero_score += 2

    if issue.verification_count >= settings.VERIFICATION_THRESHOLD and issue.status == "ai_processed":
        issue.status = "verified"

    audit = IssueUpdate(
        issue_id=issue.id,
        updated_by=profile.id,
        type="verification_milestone",
        new_status=issue.status,
        note=f"Issue verified by community member",
    )
    db.add(audit)
    await db.commit()

    return VerificationResponse(
        verification_count=issue.verification_count,
        has_verified=True,
        status=issue.status,
        hero_points_earned=2,
    )


@router.delete("/issues/{issue_id}/verify")
async def unverify_issue(
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

    if issue.status in ("in_progress", "resolved", "closed"):
        raise AppException(
            "CANNOT_UNVERIFY_AFTER_PROGRESS",
            "Cannot unverify after the issue is in progress",
        )

    result = await db.execute(
        select(Verification).where(
            Verification.issue_id == issue.id,
            Verification.user_id == profile.id,
        )
    )
    verification = result.scalar_one_or_none()
    if not verification:
        raise AppException("NOT_VERIFIED", "You haven't verified this issue")

    await db.delete(verification)

    issue.verification_count = max(0, issue.verification_count - 1)
    profile.total_verified = max(0, profile.total_verified - 1)
    profile.hero_score = max(0, profile.hero_score - 2)

    if issue.verification_count < settings.VERIFICATION_THRESHOLD and issue.status == "verified":
        issue.status = "ai_processed"

    await db.commit()

    return VerificationResponse(
        verification_count=issue.verification_count,
        has_verified=False,
        status=issue.status,
        hero_points_earned=0,
    )


@router.get("/issues/{issue_id}/verifications")
async def list_verifications(
    issue_id: str,
    page: int = 1,
    limit: int = 20,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Issue).where(Issue.id == issue_id, Issue.deleted_at.is_(None))
    )
    if not result.scalar_one_or_none():
        raise NotFound("Issue")

    total_result = await db.execute(
        select(func.count()).select_from(Verification).where(Verification.issue_id == issue_id)
    )
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        select(Verification).options(selectinload(Verification.user)).where(
            Verification.issue_id == issue_id
        ).offset(offset).limit(limit).order_by(Verification.created_at.desc())
    )
    verifications = result.scalars().all()

    entries = []
    for v in verifications:
        entries.append(VerificationEntry(
            user=VerificationUser(
                id=str(v.user.id),
                name=v.user.name,
                avatar_url=v.user.avatar_url,
            ),
            created_at=v.created_at,
        ))

    user_verif = await db.execute(
        select(Verification).where(
            Verification.issue_id == issue_id,
            Verification.user_id == profile.id,
        )
    )
    has_verified = user_verif.scalar_one_or_none() is not None

    return VerificationListOut(
        verifications=entries,
        total=total,
        has_verified=has_verified,
    )
