import httpx
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import AppException
from app.core.security import get_current_user_id
from app.database import get_db
from app.models.profile import Profile
from app.schemas.auth import ForgotPasswordRequest, RefreshRequest, SessionResponse, SignInRequest, SignUpRequest, TokenResponse
from app.schemas.profile import ProfileBrief

router = APIRouter(prefix="/auth", tags=["auth"])

SUPABASE_AUTH = f"{settings.SUPABASE_URL}/auth/v1"


def _supabase_headers(use_service_role: bool = False):
    key = settings.SUPABASE_SERVICE_ROLE_KEY if use_service_role else settings.SUPABASE_ANON_KEY
    return {
        "apikey": key,
        "Content-Type": "application/json",
    }


@router.post("/signup")
async def signup(body: SignUpRequest, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_AUTH}/signup",
            headers=_supabase_headers(),
            json={
                "email": body.email,
                "password": body.password,
                "data": {"name": body.name},
            },
        )
        data = resp.json()

    if resp.status_code != 200:
        code = data.get("code", "SIGNUP_FAILED").upper()
        raise AppException(code, data.get("msg", "Signup failed"))

    user_id = data["user"]["id"]

    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        profile = Profile(id=user_id, name=body.name.strip(), email=body.email, phone=body.phone)
        db.add(profile)
        await db.commit()
    elif body.phone:
        profile.phone = body.phone
        await db.commit()

    return {
        "user": {"id": user_id, "email": data["user"]["email"], "name": body.name},
        "session": {
            "access_token": data["access_token"],
            "refresh_token": data["refresh_token"],
        },
    }


@router.post("/signin")
async def signin(body: SignInRequest, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_AUTH}/token?grant_type=password",
            headers=_supabase_headers(),
            json={"email": body.email, "password": body.password},
        )
        data = resp.json()

    if resp.status_code != 200:
        raise AppException("INVALID_CREDENTIALS", "Wrong email or password")

    user_id = data["user"]["id"]

    result = await db.execute(select(Profile).where(Profile.id == user_id, Profile.deleted_at.is_(None)))
    profile = result.scalar_one_or_none()

    if profile and not profile.is_active:
        raise AppException("ACCOUNT_DISABLED", "Account is disabled")

    if profile is None:
        profile = Profile(
            id=user_id,
            name=data["user"]["user_metadata"].get("name", data["user"]["email"].split("@")[0]),
            email=data["user"]["email"],
        )
        db.add(profile)
        await db.commit()

    return SessionResponse(
        session=TokenResponse(access_token=data["access_token"], refresh_token=data["refresh_token"]),
        profile=ProfileBrief(
            id=str(profile.id),
            name=profile.name,
            role=profile.role,
            hero_score=profile.hero_score,
            avatar_url=profile.avatar_url,
            department_id=str(profile.department_id) if profile.department_id else None,
        ),
    )


@router.post("/signout")
async def signout(
    user_id: str = Depends(get_current_user_id),
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
):
    token = credentials.credentials if credentials else ""
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{SUPABASE_AUTH}/logout",
            headers={**_supabase_headers(), "Authorization": f"Bearer {token}"},
        )
    return {"success": True, "message": "Signed out"}


@router.post("/refresh")
async def refresh(body: RefreshRequest):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_AUTH}/token?grant_type=refresh_token",
            headers=_supabase_headers(),
            json={"refresh_token": body.refresh_token},
        )
        data = resp.json()

    if resp.status_code != 200:
        raise AppException("INVALID_REFRESH_TOKEN", "Invalid or expired refresh token", status_code=401)

    return TokenResponse(access_token=data["access_token"], refresh_token=data["refresh_token"])


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_AUTH}/recover",
            headers=_supabase_headers(),
            json={"email": body.email},
        )

    if resp.status_code != 200:
        raise AppException("RESET_FAILED", "Failed to send reset email")

    return {"success": True, "message": "If the email exists, a reset link has been sent"}
