import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.config import settings
from app.database import get_db
from app.models.profile import Profile
from app.schemas.profile import CreateDeptAdminRequest, ToggleUserRequest

router = APIRouter(prefix="/admin", tags=["admin"])

SUPABASE_AUTH = f"{settings.SUPABASE_URL}/auth/v1"


def _admin_headers():
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


@router.post("/create-dept-admin")
async def create_dept_admin(
    body: CreateDeptAdminRequest,
    admin: Profile = Depends(require_role("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_AUTH}/admin/users",
            headers=_admin_headers(),
            json={
                "email": body.email,
                "password": None,
                "email_confirm": True,
                "user_metadata": {"name": body.name},
            },
        )
        data = resp.json()

    if resp.status_code != 200:
        err = data.get("error_description", data.get("msg", "Failed to create user"))
        return {"success": False, "error": {"code": "CREATE_FAILED", "message": err}}

    user_id = data["user"]["id"]

    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()
    if profile:
        profile.role = "department_admin"
        profile.department_id = body.department_id
        profile.name = body.name.strip()
    else:
        profile = Profile(
            id=user_id,
            name=body.name.strip(),
            email=body.email,
            role="department_admin",
            department_id=body.department_id,
        )
        db.add(profile)

    await db.commit()

    return {"success": True, "data": {"id": str(profile.id), "email": body.email, "role": profile.role}}


@router.patch("/toggle-user")
async def toggle_user(
    body: ToggleUserRequest,
    admin: Profile = Depends(require_role("super_admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Profile).where(Profile.id == body.user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        return {"success": False, "error": {"code": "NOT_FOUND", "message": "User not found"}}

    profile.is_active = body.is_active
    await db.commit()

    return {"success": True, "data": {"id": str(profile.id), "is_active": profile.is_active}}
