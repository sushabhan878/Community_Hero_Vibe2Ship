# PRD-09: Analytics & Predictive Insights

## Overview
The Next.js dashboard needs aggregated data for charts, KPI cards, heatmaps, and trend analysis. Department admins see their own data; super admins see everything. This PRD defines all analytics endpoints and the SQL queries powering them.

---

## Dashboard Overview Stats

### `GET /analytics/overview`
**Auth required:** Yes (department_admin or super_admin)

Returns KPI cards for the top of the dashboard.

**Query Parameters:**
```
department_id   uuid    (super_admin only — filter to one dept; default: all)
period          string  "7d" | "30d" | "90d"   default: "30d"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "kpis": {
      "total_issues": 342,
      "total_issues_delta": 12,          // vs previous period (% change)
      "resolved_issues": 198,
      "resolution_rate": 57.9,           // percentage
      "avg_resolution_hours": 38.4,      // hours from assigned → resolved
      "open_issues": 89,                 // pending + ai_processed + verified + assigned + in_progress
      "critical_open": 7,               // open issues with severity=critical
      "verified_rate": 68.4             // % of ai_processed that reached verified
    },
    "by_status": {
      "pending": 12,
      "ai_processed": 18,
      "verified": 23,
      "assigned": 15,
      "in_progress": 31,
      "resolved": 198,
      "rejected": 34,
      "closed": 11
    },
    "by_category": [
      { "category": "pothole", "count": 98, "resolved": 67 },
      { "category": "garbage", "count": 76, "resolved": 45 },
      { "category": "streetlight", "count": 54, "resolved": 38 }
    ],
    "by_severity": {
      "critical": 12,
      "high": 87,
      "medium": 156,
      "low": 87
    }
  }
}
```

**SQL for KPIs:**
```sql
-- Total issues in period
SELECT count(*) FROM issues
WHERE created_at >= now() - interval '30 days'
  AND deleted_at IS NULL
  AND (assigned_department_id = $dept_id OR $dept_id IS NULL);

-- Avg resolution time (assigned → resolved)
SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - assigned_at)) / 3600) as avg_hours
FROM issues
WHERE resolved_at IS NOT NULL
  AND assigned_at IS NOT NULL
  AND resolved_at >= now() - interval '30 days'
  AND deleted_at IS NULL;
```

---

## Time Series Data

### `GET /analytics/trends`
**Auth required:** Yes (department_admin or super_admin)

Daily/weekly counts for line charts.

**Query Parameters:**
```
department_id   uuid
period          "30d" | "90d" | "1y"   default: "30d"
granularity     "day" | "week"          default: "day" (week for 1y)
metric          "reported" | "resolved" | "verified"   default: "reported"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "series": [
      { "date": "2025-01-01", "count": 8 },
      { "date": "2025-01-02", "count": 12 },
      { "date": "2025-01-03", "count": 5 }
    ],
    "total": 342,
    "peak_day": { "date": "2025-01-14", "count": 24 }
  }
}
```

**SQL (reported issues per day):**
```sql
SELECT
  DATE_TRUNC('day', created_at) AS date,
  count(*) AS count
FROM issues
WHERE created_at >= now() - interval '30 days'
  AND deleted_at IS NULL
GROUP BY 1
ORDER BY 1;
```

---

## Heatmap Data

### `GET /analytics/heatmap`
**Auth required:** Yes

Returns geo-clustered issue locations for the map heatmap overlay.

**Query Parameters:**
```
department_id   uuid
status          string    comma-separated status values   default: all active
category        string    filter by category
period          "7d" | "30d" | "all"   default: "30d"
bounds          string    "lat_sw,lng_sw,lat_ne,lng_ne"  (map viewport bounds)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "points": [
      {
        "latitude": 12.971598,
        "longitude": 77.594566,
        "weight": 3,        // = verification_count + 1, used for heat intensity
        "category": "pothole",
        "severity": "high"
      }
    ],
    "total": 248
  }
}
```

**SQL (within viewport bounds):**
```sql
SELECT
  latitude, longitude,
  (verification_count + 1) as weight,
  category, severity
FROM issues
WHERE deleted_at IS NULL
  AND created_at >= now() - interval '30 days'
  AND latitude BETWEEN $lat_sw AND $lat_ne
  AND longitude BETWEEN $lng_sw AND $lng_ne
  AND ($category IS NULL OR category = $category)
LIMIT 1000;
```

---

## Department Performance

### `GET /analytics/departments`
**Auth required:** Yes (super_admin only)

Comparison table across all departments.

**Query Parameters:**
```
period    "7d" | "30d" | "90d"   default: "30d"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "uuid",
        "name": "Roads & Infrastructure",
        "slug": "roads",
        "stats": {
          "total_assigned": 98,
          "resolved": 72,
          "in_progress": 15,
          "overdue": 8,              // in_progress for > 7 days
          "avg_resolution_hours": 42.1,
          "resolution_rate": 73.5
        }
      }
    ]
  }
}
```

**SQL:**
```sql
SELECT
  d.id, d.name, d.slug,
  count(i.id) FILTER (WHERE i.status NOT IN ('rejected', 'closed')) as total_assigned,
  count(i.id) FILTER (WHERE i.status = 'resolved') as resolved,
  count(i.id) FILTER (WHERE i.status = 'in_progress') as in_progress,
  count(i.id) FILTER (WHERE i.status = 'in_progress' AND i.assigned_at < now() - interval '7 days') as overdue,
  AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.assigned_at)) / 3600)
    FILTER (WHERE i.resolved_at IS NOT NULL) as avg_resolution_hours
FROM departments d
LEFT JOIN issues i ON i.assigned_department_id = d.id
  AND i.created_at >= now() - interval '30 days'
  AND i.deleted_at IS NULL
GROUP BY d.id, d.name, d.slug
ORDER BY resolution_rate DESC;
```

---

## Predictive Insights

### `GET /analytics/predictions`
**Auth required:** Yes (department_admin or super_admin)

AI-powered insights on recurring patterns and maintenance needs.

**Response:**
```json
{
  "success": true,
  "data": {
    "hotspots": [
      {
        "area": "MG Road - Brigade Road Junction",
        "lat": 12.9716,
        "lng": 77.5946,
        "issue_count_30d": 12,
        "dominant_category": "pothole",
        "prediction": "High likelihood of recurring issues. Recommend infrastructure inspection.",
        "risk_score": 87
      }
    ],
    "recurring_locations": [
      {
        "lat": 12.968,
        "lng": 77.591,
        "issue_count": 8,
        "last_resolved": "2025-01-10",
        "category": "water_leak",
        "note": "Same location resolved 3 times in 90 days — underlying pipe damage likely."
      }
    ],
    "category_trends": [
      {
        "category": "pothole",
        "trend": "increasing",
        "change_pct": 34,
        "period_comparison": "this month vs last month"
      }
    ]
  }
}
```

**Hotspot detection SQL:**
```sql
-- Cluster issues within 200m radius using PostGIS
SELECT
  ST_Y(ST_Centroid(ST_Collect(location::geometry))) as lat,
  ST_X(ST_Centroid(ST_Collect(location::geometry))) as lng,
  count(*) as issue_count,
  MODE() WITHIN GROUP (ORDER BY category) as dominant_category,
  count(*) * 10 as risk_score   -- simplified scoring for MVP
FROM issues
WHERE created_at >= now() - interval '30 days'
  AND deleted_at IS NULL
  AND status != 'rejected'
GROUP BY ST_SnapToGrid(location::geometry, 0.002)  -- ~200m grid
HAVING count(*) >= 3
ORDER BY issue_count DESC
LIMIT 10;
```

**Recurring locations SQL:**
```sql
-- Same grid cell resolved multiple times
SELECT
  ST_Y(ST_Centroid(ST_Collect(location::geometry))) as lat,
  ST_X(ST_Centroid(ST_Collect(location::geometry))) as lng,
  count(*) as issue_count,
  MAX(resolved_at) as last_resolved,
  MODE() WITHIN GROUP (ORDER BY category) as category
FROM issues
WHERE status = 'resolved'
  AND resolved_at >= now() - interval '90 days'
  AND deleted_at IS NULL
GROUP BY ST_SnapToGrid(location::geometry, 0.002)
HAVING count(*) >= 3
ORDER BY issue_count DESC
LIMIT 10;
```

---

## Issue List for Dashboard (with advanced filters)

### `GET /analytics/issues-table`
**Auth required:** Yes (department_admin or super_admin)

Optimized for the dashboard data table — sortable, filterable, paginated.

**Query Parameters:**
```
page            int
limit           int       default: 25
status          string    comma-separated
category        string    comma-separated
severity        string    comma-separated
department_id   uuid
date_from       ISO date
date_to         ISO date
sort_by         "created_at" | "severity" | "verification_count" | "updated_at"
sort_order      "asc" | "desc"
search          string    searches title
```

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
        "severity": "critical",
        "status": "in_progress",
        "verification_count": 14,
        "address": "MG Road, Bangalore",
        "reporter": { "name": "Rajan M." },
        "assigned_department": { "name": "Roads & Infrastructure" },
        "created_at": "...",
        "updated_at": "...",
        "days_open": 3
      }
    ],
    "pagination": { "page": 1, "limit": 25, "total": 89, "has_more": true }
  }
}
```

**`days_open` computed field:**
```sql
EXTRACT(DAY FROM (COALESCE(resolved_at, now()) - created_at)) as days_open
```

---

## Caching Strategy

Analytics queries are expensive — cache results:

| Endpoint | Cache Duration | Cache Key |
|---|---|---|
| `/analytics/overview` | 5 minutes | `overview:{dept_id}:{period}` |
| `/analytics/trends` | 15 minutes | `trends:{dept_id}:{period}:{metric}` |
| `/analytics/heatmap` | 5 minutes | `heatmap:{bounds}:{period}` |
| `/analytics/departments` | 10 minutes | `departments:{period}` |
| `/analytics/predictions` | 60 minutes | `predictions:{dept_id}` |

**Implementation:** Use Supabase Edge Function in-memory cache (Map) or Redis if available. For MVP, 60-second in-memory cache is sufficient.

---

## Acceptance Criteria
- [ ] Overview KPIs match manual count queries (verified by testing)
- [ ] `total_issues_delta` correctly shows % change vs previous period
- [ ] Trends endpoint returns one data point per day for "30d" period (no gaps)
- [ ] Heatmap only returns issues within the requested viewport bounds
- [ ] Dept performance table ranks correctly by resolution rate
- [ ] Predictions hotspots show at least 3 issues per cluster
- [ ] Recurring locations show only areas with 3+ resolved issues in 90 days
- [ ] `issues-table` sort_by `severity` orders: critical → high → medium → low
- [ ] Department admin sees only their department's data (enforced server-side)
- [ ] Super admin sees all departments
- [ ] All queries complete in < 2 seconds under normal load
