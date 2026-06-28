from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Community Hero API"
    DEBUG: bool = False

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/community_hero"

    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    STORAGE_BUCKET: str = "issue-media"
    STORAGE_MAX_FILE_SIZE: int = 50 * 1024 * 1024
    STORAGE_ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp"]
    STORAGE_ALLOWED_VIDEO_TYPES: list[str] = ["video/mp4"]

    EXPO_PUSH_API: str = "https://exp.host/--/api/v2/push/send"

    RATE_LIMIT_ISSUES_PER_24H: int = 10
    RATE_LIMIT_VERIFICATIONS_PER_HOUR: int = 20
    VERIFICATION_THRESHOLD: int = 5

    class Config:
        env_file = ".env"


settings = Settings()
