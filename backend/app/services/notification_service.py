import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.notification import Notification
from app.models.push_token import PushToken

logger = logging.getLogger(__name__)


async def send_notification(
    user_id: str,
    type: str,
    title: str,
    body: str,
    issue_id: str | None = None,
    db: AsyncSession | None = None,
):
    if db is None:
        logger.warning("No db session provided; skipping notification storage")
        return

    notification = Notification(
        user_id=user_id,
        issue_id=issue_id,
        type=type,
        title=title,
        body=body,
    )
    db.add(notification)

    result = await db.execute(
        select(PushToken).where(PushToken.user_id == user_id)
    )
    tokens = result.scalars().all()

    if tokens:
        await send_expo_push(tokens, title, body, {"issue_id": issue_id, "type": type})


async def send_expo_push(tokens: list, title: str, body: str, data: dict):
    messages = [
        {
            "to": t.token,
            "title": title,
            "body": body,
            "data": data,
            "sound": "default",
        }
        for t in tokens
    ]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(settings.EXPO_PUSH_API, json=messages)
            resp.raise_for_status()
    except Exception as e:
        logger.error(f"Expo push notification failed: {e}")
