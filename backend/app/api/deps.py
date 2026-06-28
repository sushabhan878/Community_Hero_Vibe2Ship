from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import Forbidden
from app.core.security import get_current_user_id
from app.database import get_db
from app.models.profile import Profile


async def get_current_profile(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Profile:
    result = await db.execute(select(Profile).where(Profile.id == user_id, Profile.deleted_at.is_(None)))
    profile = result.scalar_one_or_none()
    if profile is None:
        raise Forbidden("Profile not found or account disabled")
    if not profile.is_active:
        raise Forbidden("Account is disabled")
    return profile


def require_role(*roles: str):
    async def role_checker(profile: Profile = Depends(get_current_profile)) -> Profile:
        if profile.role not in roles:
            raise Forbidden("Insufficient permissions")
        return profile
    return role_checker
