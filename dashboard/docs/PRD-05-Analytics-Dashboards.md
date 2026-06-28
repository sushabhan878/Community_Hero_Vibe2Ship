# PRD-05: Analytics Dashboards

## Overview
The analytics hub for department admins and super admins. Provides KPI overview charts, trend analysis, heatmap visualization, and department comparison. All data is aggregated server-side via the `/analytics/*` backend endpoints.

---

## Route
`/dashboard/analytics`

---

## Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Analytics Dashboard                    [Period: 30d ▼] [⟳]  │
│                                                                │
│ ┌──────────┬──────────┬──────────┬──────────┐                 │
│ │ Total    │ Resolved │ Avg      │ Critical │                 │
│ │ Issues   │ 198      │ Resolution│ Open     │                 │
│ │ 342      │ 57.9%    │ 38.4 hrs │ 7       │                 │
│ │ ▲ 12%    │ ▲ 3%     │ ▼ 2%     │ —        │                 │
│ └──────────┴──────────┴──────────┴──────────┘                 │
│                                                                │
│ ┌──────────────────────┐  ┌──────────────────────┐            │
│ │ Issues by Status      │  │ Issues by Severity   │            │
│ │ [Donut Chart]         │  │ [Bar Chart]           │            │
│ │                       │  │                       │            │
│ │ Resolved   58%        │  │ Critical  12  ████    │            │
│ │ In Progress 9%        │  │ High      87  ███████ │            │
│ │ Open       23%        │  │ Medium   156  ████████│            │
│ │ Rejected    10%       │  │ Low       87  ███████ │            │
│ └──────────────────────┘  └──────────────────────┘            │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ Issues Over Time (Reported vs Resolved)               │      │
│ │ [Line Chart]                                         │      │
│ │                                                      │      │
│ │  ██                                                  │      │
│ │  ██ ██                                               │      │
│ │  ██ ██ ██    ██                                      │      │
│ │  ██ ██ ██ ██ ██ ██                                   │      │
│ │  ──┴──┴──┴──┴──┴──┴──┴──┴──┴──                       │      │
│ │  Jan 1          Jan 15          Jan 30                │      │
│ └──────────────────────────────────────────────────────┘      │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ Issue Heatmap                                        │      │
│ │ [Map component with heatmap overlay]                  │      │
│ │                                                      │      │
│ │     🔴🔴    🔴                                       │      │
│ │  🔴    🔴🔴🔴    🔴                                  │      │
│ │     🔴    🔴      🔴🔴                               │      │
│ │        🔴                                              │      │
│ └──────────────────────────────────────────────────────┘      │
│                                                                │
│ ┌──────────────────────────────────────────────────────┐      │
│ │ Department Performance  (super_admin only)            │      │
│ │                                                      │      │
│ │ Dept          │ Issues │ Resolved │ Rate  │ Avg hrs │      │
│ │ ──────────────┼────────┼──────────┼───────┼─────────│      │
│ │ Roads         │ 98     │ 72       │ 73.5% │ 42.1h   │      │
│ │ Water         │ 45     │ 38       │ 84.4% │ 28.3h   │      │
│ │ Electricity   │ 54     │ 42       │ 77.8% │ 35.0h   │      │
│ │ Waste         │ 76     │ 45       │ 59.2% │ 52.7h   │      │
│ └──────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

---

## KPI Cards (Top Row)

### Cards

| KPI | Description | Delta | Color |
|---|---|---|---|
| Total Issues | Issue count in period | % change vs previous period | Blue |
| Resolution Rate | % resolved of total | % change | Green |
| Avg Resolution Time | Avg hours assigned→resolved | % change (negative = good) | Amber |
| Critical Open | Open issues with severity=critical | Raw change | Red |

### Card Component Behavior
- Click on card → filter the charts below by that metric's context
- Delta arrow: ▲ = improvement (for positive metrics), ▼ = decline
- Delta color: green for improvement, red for decline, gray for neutral

---

## Charts Section

### Issues by Status (Donut Chart)
**Data source:** `GET /analytics/overview` → `by_status`

| Slice | Color |
|---|---|
| Resolved | Green (#22c55e) |
| In Progress | Blue (#3b82f6) |
| Verified | Purple (#a855f7) |
| Assigned | Orange (#f97316) |
| AI Processed | Yellow (#eab308) |
| Pending | Gray (#6b7280) |
| Rejected | Red (#ef4444) |
| Closed | Dark Gray (#4b5563) |

Hover: tooltip with count + percentage

### Issues by Severity (Bar Chart)
**Data source:** `GET /analytics/overview` → `by_severity`

- Horizontal bar chart
- Each bar colored by severity level
- Count label at end of each bar

### Issues Over Time (Line Chart)
**Data source:** `GET /analytics/trends`

| Property | Value |
|---|---|
| X-axis | Date (daily for 30d, weekly for 90d+) |
| Y-axis | Count |
| Lines | Reported (blue solid), Resolved (green dashed) |
| Interaction | Hover shows date + count tooltip |
| Peak marker | Dot on highest point with label |

### Chart Empty State
- "Not enough data yet. Check back after issues are reported."
- Greyed-out chart skeleton with dashed grid lines

---

## Map / Heatmap

### Component: Map with Heatmap Layer
**Data source:** `GET /analytics/heatmap`

| Property | Value |
|---|---|
| Map library | Leaflet + react-leaflet |
| Tile provider | OpenStreetMap (free, no API key) |
| Heatmap lib | leaflet.heat |
| Initial view | Department's assigned area (or city center for super_admin) |
| Clustering | Default on; clusters merge nearby points |

### Heatmap Behavior
- Points are weighted by `verification_count + 1`
- Red/orange/yellow gradient (red = high density)
- Click on point → tooltip with category + severity
- Double-click → zoom to that area
- Right-click → "View issues near here" (filters issue table by proximity)

### Controls
| Control | Action |
|---|---|
| +/- zoom | Standard map zoom |
| Category filter | Dropdown: all / specific category |
| Period filter | 7d / 30d / all |
| Fullscreen | Toggle map to full viewport |

### Empty State
- "No issues reported in this area yet."
- Map centered on default location with marker showing "You are here"

---

## Department Performance Table (Super Admin Only)

**Data source:** `GET /analytics/departments`

### Columns

| Column | Sortable | Description |
|---|---|---|
| Department | No | Name + slug |
| Total Assigned | Yes | Issues assigned in period |
| Resolved | Yes | Count resolved |
| In Progress | Yes | Currently in progress |
| Overdue | Yes | In progress > 7 days |
| Avg Resolution Time | Yes | Hours |
| Resolution Rate | Yes | Percentage |

### Row Highlighting
- Best-performing department: green left border
- Worst-performing: red left border
- Overdue > 10: red text on count

---

## Predictive Insights Section

**Data source:** `GET /analytics/predictions`

### Hotspots Card
- List of top 10 high-frequency areas
- Each item: area name, issue count, dominant category, risk score (0-100)
- Risk score color: green (<40), amber (40-70), red (>70)

### Recurring Locations Card
- List of areas with 3+ resolved issues recurring
- "Same issue resolved X times in 90 days" warning
- "Schedule inspection" suggestion CTA

### Category Trends
- Simple up/down arrows next to each category
- "% change vs last period"
- Example: "Pothole ▲ 34% this month vs last month"

---

## Period Selector

| Option | Description |
|---|---|
| 7d | Last 7 days |
| 30d | Last 30 days (default) |
| 90d | Last 90 days |

Changing period refetches all data on the page.

---

## Loading State

- Full-page skeleton grid matching the 4 KPI cards + chart placeholders
- Cards show animated pulse blocks
- Charts show gray skeleton shapes matching their layout
- Map shows gray rectangle with "Loading map…" text

---

## Error State

- KPI cards show "—" for failed metrics
- Charts show "Failed to load" with retry button
- Map shows "Map unavailable" fallback
- Page-level error banner: "Some analytics failed to load. [Retry]"

---

## Caching

| Data | Cache Strategy | Refresh |
|---|---|---|
| KPI cards | 5 min | Manual refresh button + periodic refetch |
| Charts | 15 min | Manual refresh |
| Heatmap | 5 min | On map pan/zoom end |
| Department table | 10 min | Manual refresh |
| Predictions | 60 min | Manual refresh |

---

## Acceptance Criteria
- [ ] All 4 KPI cards render with correct data and delta indicators
- [ ] Donut chart shows correct status distribution; hover shows tooltip
- [ ] Severity bar chart renders with proper coloring
- [ ] Line chart shows reported vs resolved over selected period
- [ ] Changing period refetches all data on page
- [ ] Heatmap renders points from `/analytics/heatmap` response
- [ ] Category filter on map refetches heatmap data
- [ ] Department table is visible only to super_admin
- [ ] Department table columns sort correctly
- [ ] Predictions section renders hotspots + recurring locations
- [ ] Loading skeleton shows during initial fetch
- [ ] Error state shows per-widget failure with retry
- [ ] Manual refresh button refetches all data
