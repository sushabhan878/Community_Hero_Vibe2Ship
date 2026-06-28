from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_profile
from app.core.exceptions import ValidationError
from app.database import get_db
from app.models.badge import Badge
from app.models.department import Department
from app.models.profile import Profile
from app.models.push_token import PushToken
from app.schemas.profile import (
    BadgeOut,
    DepartmentOut,
    ProfileOut,
    PushTokenRequest,
    UpdateProfileRequest,
)

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/me")
async def get_my_profile(
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Profile)
        .options(selectinload(Profile.badges), selectinload(Profile.department))
        .where(Profile.id == profile.id)
    )
    profile = result.scalar_one()

    badges = [BadgeOut(slug=b.slug, awarded_at=b.awarded_at) for b in profile.badges]
    department = None
    if profile.department:
        department = DepartmentOut(id=str(profile.department.id), name=profile.department.name, slug=profile.department.slug)

    return ProfileOut(
        id=str(profile.id),
        name=profile.name,
        email=profile.email,
        phone=profile.phone,
        avatar_url=profile.avatar_url,
        role=profile.role,
        hero_score=profile.hero_score,
        total_reports=profile.total_reports,
        total_resolved=profile.total_resolved,
        total_verified=profile.total_verified,
        badges=badges,
        department=department,
    )


@router.patch("/me")
async def update_profile(
    body: UpdateProfileRequest,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    if body.name is not None:
        if len(body.name.strip()) < 2:
            raise ValidationError("Name must be at least 2 characters")
        profile.name = body.name.strip()
    if body.phone is not None:
        profile.phone = body.phone

    await db.commit()
    await db.refresh(profile)
    return {"success": True, "data": {"name": profile.name, "phone": profile.phone}}


@router.post("/push-token")
async def register_push_token(
    body: PushTokenRequest,
    profile: Profile = Depends(get_current_profile),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(PushToken).where(PushToken.token == body.token)
    )
    token_row = existing.scalar_one_or_none()
    if token_row:
        token_row.user_id = profile.id
    else:
        token_row = PushToken(user_id=profile.id, token=body.token, platform=body.platform)
        db.add(token_row)

    await db.commit()
    return {"success": True, "message": "Push token registered"}
