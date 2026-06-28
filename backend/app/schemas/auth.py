from pydantic import BaseModel, EmailStr, field_validator


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str | None = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("name")
    @classmethod
    def name_non_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str


class SessionResponse(BaseModel):
    session: TokenResponse
    profile: "ProfileBrief"


class AuthResponse(BaseModel):
    user: dict
    session: TokenResponse


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


from app.schemas.profile import ProfileBrief
SessionResponse.model_rebuild()
