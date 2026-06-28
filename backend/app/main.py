from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api import auth, profile, issues, verification, admin
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(issues.router)
app.include_router(verification.router)
app.include_router(admin.router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "data": None, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": settings.APP_NAME}
