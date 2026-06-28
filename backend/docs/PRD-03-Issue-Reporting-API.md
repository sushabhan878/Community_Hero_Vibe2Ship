# PRD-03: Issue Reporting API

## Overview
The core reporting flow — citizens submit civic issues with images/video, location, and description. This PRD covers the full issue CRUD lifecycle from the client's perspective. AI processing (PRD-04) is triggered asynchronously after submission.

---

## Media Upload (Pre-step before issue creation)

### `POST /issues/upload-media`
**Auth required:** Yes (citizen)

Media must be uploaded BEFORE the issue is created. Returns storage URLs that get embedded in the issue.

**Request:** `multipart/form-data`
```
fields:
  files[]     — up to 5 images (JPEG/PNG/WEBP, max 10MB each) OR 1 video (MP4, max 50MB)
  issue_temp_id — client-generated UUID, used as folder name before issue exists
```

**Logic:**
1. Validate file count (max 5 images OR 1 video), MIME types, sizes
2. For each image: compress to max 1920px wide, convert to WEBP (reduces size ~60%)
3. Upload to Supabase Storage path: `issue-media/{user_id}/{temp_id}/{filename}`
4. Return array of storage paths

**Response:**
```json
{
  "success": true,
  "data": {
    "image_urls": [
      "issue-media/user123/temp456/img1.webp",
      "issue-media/user123/temp456/img2.webp"
    ],
    "video_url": null
  }
}
```

**Constraints:**
- Cannot mix images and video in same upload
- Images: max 5 files, max 10MB each
- Video: max 1 file, max 50MB, MP4 only
- Storage paths are NOT public URLs — clients request signed URLs separately

---

## Issue Creation

### `POST /issues`
**Auth required:** Yes (citizen)

**Request Body:**
```json
{
  "title": "Large pothole on MG Road near HDFC ATM",
  "description": "About 1 foot wide, causing vehicles to swerve. Has been here for 2 weeks.",
  "category": "pothole",
  "severity": "high",
  "latitude": 12.971598,
  "longitude": 77.594566,
  "address": "MG Road, Bangalore, Karnataka 560001",
  "ward": "Shivajinagar",
  "image_urls": ["issue-media/user123/temp456/img1.webp"],
  "video_url": null
}
```

**Validation Rules:**
| Field | Rule |
|---|---|
| `title` | Required, 5–100 chars |
| `description` | Optional, max 1000 chars |
| `category` | Required, must be valid `issue_category` enum value |
| `severity` | Required, must be valid `issue_severity` enum value |
| `latitude` | Required, -90 to 90 |
| `longitude` | Required, -180 to 180 |
| `image_urls` | Required, at least 1 image, must be valid Storage paths |
| `address` | Optional, max 300 chars |

**Logic:**
1. Validate all fields
2. Verify `image_urls` paths belong to `auth.uid()` (path starts with `issue-media/{user_id}/`)
3. Insert into `issues` table with `status = 'pending'` and `reporter_id = auth.uid()`
4. Insert `issue_updates` audit record: `{ type: 'status_change', new_status: 'pending' }`
5. Increment `profiles.total_reports` for reporter
6. **Asynchronously** invoke `process-issue` Edge Function (do not await)
7. Return created issue

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "issue-uuid",
    "status": "pending",
    "created_at": "2025-01-15T10:30:00Z",
    "message": "Issue submitted. AI is analyzing your report."
  }
}
```

**Error Cases:**
| Code | Trigger |
|---|---|
| `VALIDATION_ERROR` | Any field fails validation |
| `INVALID_MEDIA_PATH` | image_urls don't belong to user |
| `RATE_LIMITED` | More than 10 reports in 24h from same user |

**Rate Limiting:**
- Max 10 issue submissions per user per 24 hours
- Checked via count query: `SELECT count(*) FROM issues WHERE reporter_id = $uid AND created_at > now() - interval '24 hours'`

---

## Issue Retrieval

### `GET /issues`
**Auth required:** Yes

Paginated list of issues with filtering. Used by both mobile feed and dashboard.

**Query Parameters:**
```
page          int       default: 1
limit         int       default: 20, max: 100
status        string    filter by status (comma-separated: "pending,verified")
category      string    filter by category
severity      string    filter by severity
department_id uuid      filter by assigned department
reporter_id   uuid      filter by reporter (for "my issues")
lat           float     center lat for proximity filter
lng           float     center lng for proximity filter
radius_km     float     default: 5, max: 50 — proximity radius in km
sort          string    "newest" | "nearest" | "most_verified" | "severity"
              default: "newest"
search        string    full-text search on title
```

**Logic:**
1. Build query dynamically based on filters
2. For proximity filter: use PostGIS `ST_DWithin(location, ST_Point(lng, lat)::geography, radius_km * 1000)`
3. For text search: use `title ILIKE '%search%'` (or pg_trgm for better performance)
4. Exclude `deleted_at IS NOT NULL` rows
5. Department admins: automatically filter to their department's issues only (enforced server-side, not just RLS)
6. Return paginated results with signed URLs for images

**Response:**
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "id": "uuid",
        "title": "Large pothole on MG Road",
        "category": "pothole",
        "severity": "high",
        "status": "verified",
        "latitude": 12.971598,
        "longitude": 77.594566,
        "address": "MG Road, Bangalore",
        "upvote_count": 12,
        "verification_count": 7,
        "image_urls": ["https://signed-url.supabase.co/..."],
        "ai_summary": "Large pothole approximately 30cm wide obstructing traffic.",
        "reporter": { "id": "uuid", "name": "Rajan M.", "avatar_url": "..." },
        "created_at": "2025-01-15T10:30:00Z",
        "has_verified": false   // whether the current user has verified this issue
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 143,
      "has_more": true
    }
  }
}
```

**Note on `has_verified`:** Checked against `verifications` table for `auth.uid()`. Shows upvote button state in mobile.

---

### `GET /issues/:id`
**Auth required:** Yes

Single issue with full detail, including status timeline.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "...",
    "description": "...",
    "category": "pothole",
    "severity": "high",
    "ai_category": "pothole",
    "ai_severity": "critical",
    "ai_summary": "Deep pothole causing traffic hazard.",
    "ai_confidence": 0.94,
    "status": "in_progress",
    "latitude": 12.971598,
    "longitude": 77.594566,
    "address": "...",
    "image_urls": ["https://signed-url..."],
    "video_url": null,
    "upvote_count": 18,
    "verification_count": 9,
    "reporter": { "id": "uuid", "name": "Rajan M.", "hero_score": 250 },
    "assigned_department": { "id": "uuid", "name": "Roads & Infrastructure" },
    "has_verified": true,
    "timeline": [
      { "type": "status_change", "new_status": "pending", "created_at": "..." },
      { "type": "ai_processed", "note": "AI categorized as pothole, severity: critical", "created_at": "..." },
      { "type": "verification_milestone", "note": "5 community verifications reached", "created_at": "..." },
      { "type": "department_assigned", "note": "Assigned to Roads & Infrastructure", "created_at": "..." },
      { "type": "status_change", "old_status": "assigned", "new_status": "in_progress", "created_at": "..." }
    ],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

### `GET /issues/nearby`
**Auth required:** Yes

Optimized proximity endpoint for map view. Returns lightweight markers only (no full descriptions).

**Query Parameters:**
```
lat       float   required
lng       float   required
radius_km float   default: 2, max: 20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markers": [
      {
        "id": "uuid",
        "latitude": 12.971598,
        "longitude": 77.594566,
        "category": "pothole",
        "severity": "high",
        "status": "verified"
      }
    ]
  }
}
```

**Note:** Used by mobile map view — lightweight to avoid payload bloat on map pan/zoom.

---

## Issue Edit & Delete

### `PATCH /issues/:id`
**Auth required:** Yes, must be issue's reporter, status must be `pending`

Citizens can only edit their own issues while still in `pending` status (before AI processes).

**Request Body (all optional):**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "category": "road_damage",
  "severity": "critical"
}
```

**Logic:**
1. Verify `reporter_id = auth.uid()` and `status = 'pending'`
2. Update allowed fields only (not lat/lng, not image_urls — media is final)
3. Insert `issue_updates` audit record

---

### `DELETE /issues/:id`
**Auth required:** Yes

Soft delete only.

**Logic:**
1. Citizens: can only delete own issues in `pending` status
2. Super admin: can delete any issue
3. Set `deleted_at = now()`, insert `issue_updates` audit record
4. Media in Storage is NOT deleted immediately (cleanup job runs nightly)

---

## Signed URL Helper

### `POST /issues/signed-urls`
**Auth required:** Yes

Images are stored privately. Clients need signed URLs to display them.

**Request Body:**
```json
{ "paths": ["issue-media/user123/issue456/img1.webp"] }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "urls": {
      "issue-media/user123/issue456/img1.webp": "https://signed-url.supabase.co/...?token=...&expires=3600"
    }
  }
}
```

**Note:** Signed URLs expire in 1 hour. Lists endpoint pre-signs all image URLs before responding, so clients don't need to call this separately.

---

## Acceptance Criteria
- [ ] Issue created with at least 1 image
- [ ] Media path ownership validated (cannot reference another user's media)
- [ ] Rate limiting: 11th submission in 24h returns `RATE_LIMITED`
- [ ] Proximity query returns correct results using PostGIS
- [ ] `has_verified` flag is accurate per authenticated user
- [ ] Department admin list query is automatically scoped to their department
- [ ] Timeline includes all status changes in chronological order
- [ ] Edit is blocked if status is not `pending`
- [ ] Soft delete works; deleted issues don't appear in list queries
- [ ] Signed URLs returned for all image_urls in list and detail responses
