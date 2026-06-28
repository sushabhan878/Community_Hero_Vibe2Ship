import json
import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

logger = logging.getLogger(__name__)

CATEGORY_TO_DEPT = {
    "pothole": "roads",
    "road_damage": "roads",
    "water_leak": "water",
    "sewage": "water",
    "streetlight": "electricity",
    "garbage": "waste",
    "illegal_dumping": "waste",
    "fallen_tree": "parks",
    "park_damage": "parks",
    "other": "other",
}


async def process_issue_with_ai(issue_id: str, db: AsyncSession) -> None:
    from app.models.issue import Issue
    from app.models.issue_update import IssueUpdate
    from app.models.department import Department
    from app.models.notification import Notification

    result = await db.execute(
        select(Issue).where(Issue.id == issue_id)
    )
    issue = result.scalar_one_or_none()
    if not issue or issue.status != "pending":
        return

    ai_result = await call_gemini(issue)
    if ai_result is None:
        return

    is_valid = ai_result.get("is_valid_civic_issue", True)
    is_duplicate = False
    duplicate_of = None
    new_status = "ai_processed"

    if not is_valid:
        new_status = "rejected"

    dept_slug = CATEGORY_TO_DEPT.get(ai_result.get("category", "other"), "other")
    dept_result = await db.execute(
        select(Department).where(Department.slug == dept_slug)
    )
    department = dept_result.scalar_one_or_none()

    if ai_result.get("confidence", 0.5) > 0.7:
        issue.category = ai_result.get("category", issue.category)
        issue.severity = ai_result.get("severity", issue.severity)

    issue.ai_category = ai_result.get("category")
    issue.ai_severity = ai_result.get("severity")
    issue.ai_summary = ai_result.get("summary")
    issue.ai_confidence = ai_result.get("confidence", 0.5)
    issue.ai_is_duplicate = is_duplicate
    issue.ai_duplicate_of = duplicate_of
    issue.ai_processed_at = __import__("datetime").datetime.now(__import__("zoneinfo").ZoneInfo("UTC"))
    issue.status = new_status

    if new_status == "ai_processed" and department:
        issue.assigned_department_id = department.id
        issue.assigned_at = __import__("datetime").datetime.now(__import__("zoneinfo").ZoneInfo("UTC"))

    audit = IssueUpdate(
        issue_id=issue.id,
        updated_by=issue.reporter_id,
        type="ai_processed",
        new_status=new_status,
        note=(
            f"AI classified: {ai_result.get('category')}, "
            f"severity: {ai_result.get('severity')}, "
            f"confidence: {int(ai_result.get('confidence', 0) * 100)}%"
        ),
        extra_meta={
            "ai_category": ai_result.get("category"),
            "ai_severity": ai_result.get("severity"),
            "ai_confidence": ai_result.get("confidence"),
            "department_assigned": str(department.id) if department else None,
        },
    )
    db.add(audit)

    if new_status == "ai_processed":
        notification = Notification(
            user_id=issue.reporter_id,
            issue_id=issue.id,
            type="issue_assigned",
            title="Issue Routed to Department",
            body=f"Your {ai_result.get('category', 'issue')} report has been assigned to {department.name if department else 'the appropriate department'}.",
        )
        db.add(notification)

    await db.commit()


async def call_gemini(issue) -> dict | None:
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set; skipping AI processing")
        return {
            "category": issue.category,
            "severity": issue.severity,
            "confidence": 0.5,
            "summary": issue.title[:100],
            "is_valid_civic_issue": True,
        }

    prompt = f"""Analyze this civic issue report and respond with JSON only.

User's title: "{issue.title}"
User's description: "{issue.description}"
User's category: "{issue.category}"
User's severity: "{issue.severity}"

Respond with this exact JSON structure:
{{
  "category": one of [pothole, road_damage, water_leak, sewage, streetlight, garbage, illegal_dumping, fallen_tree, park_damage, other],
  "severity": one of [low, medium, high, critical],
  "confidence": float between 0 and 1,
  "summary": "one sentence description of what you see, max 100 chars",
  "is_valid_civic_issue": true or false,
  "rejection_reason": "only if is_valid_civic_issue is false, explain why",
  "estimated_resolution_days": integer estimate of how long this typically takes to fix
}}"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent",
                params={"key": settings.GEMINI_API_KEY},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 512},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            cleaned = text.replace("```json", "").replace("```", "").strip()
            return json.loads(cleaned)
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        return None
