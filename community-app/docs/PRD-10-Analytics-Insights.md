# PRD-10: Analytics & Insights

## Overview
Data visualization screens showing trends, heatmaps, predictions, and department performance. Designed for both citizens (view-only insights) and department admins (actionable analytics).

---

## Screen: Analytics Overview (`analytics/index.tsx`)

### Access Control
- Citizens: view-only, limited scope (their ward/city)
- Dept admins: full department data
- Super admin: cross-department comparison

---

### Section 1: Trend Charts

**Time Series Line Chart:**
```
Issues Over Time ── Last 30 Days
  ▲
15│        ╱╲
10│  ╱╲  ╱  ╲  ╱╲
 5│ ╱  ╲╱    ╲╱  ╲
 0└──────────────────▶
   Week 1  Week 2  Week 3  Week 4
   ── Reported  ── Resolved  ── Verified
```

**Metrics:**
| Chart | Metric | Granularity |
|---|---|---|
| Reported vs Resolved | Count of issues | Day / Week |
| Category Breakdown | Stacked bar by category | Week |
| Severity Distribution | Stacked bar by severity | Week |

**Interactions:**
- Tap legend to toggle lines
- Long-press data point for tooltip with exact value
- Pinch to zoom (horizontal)
- Period picker: 7D | 30D | 90D

---

### Section 2: Heatmap Overlay

```
[Map View with heatmap overlay]
  🔴🔴🔴  (high concentration)
  🟡🟡    (medium)
  🟢      (low)
```

**Data Source:** `GET /analytics/heatmap` — geo-clustered issue points

**Behavior:**
- Heatmap layer on map (weighted by verification count)
- Toggle between heatmap and regular markers
- Filter by category, status, severity
- Tap cluster → see issue breakdown in that area

**Colors:**
- Low concentration: green (0-5 issues)
- Medium: yellow (5-15)
- High: orange (15-30)
- Critical: red (30+)

---

### Section 3: Department Comparison (Super Admin)

```
Department Performance ── Last 30 Days

Dept         Assigned  Resolved  Rate   Avg Time
Roads        42        28        67%    48h
Water        18        12        67%    36h
Electricity   9         8        89%    12h
Waste        24        15        63%    72h
```

- Horizontal bar chart or table
- Columns: Assigned, Resolved, Resolution Rate, Avg Resolution Time
- Overdue issues (>7 days in progress) highlighted in red
- Sort by any column

---

### Section 4: AI Predictions & Insights

**Hotspots Card:**
```
🔥 Hotspots Detected
┌─────────────────────────────────────┐
│ 📍 MG Road Junction         Risk: 87│
│    Pothole cluster — 4 reports      │
│    Predicted: 2 more in 7 days      │
├─────────────────────────────────────┤
│ 📍 Indiranagar Market     Risk: 72  │
│    Garbage buildup — 3 reports      │
│    Predicted: 1 more in 3 days      │
└─────────────────────────────────────┘
```

**Recurring Issues Card:**
```
🔄 Recurring Locations
┌─────────────────────────────────────┐
│ 📍 Koramangala Water Line           │
│    Water leak — 3 times in 90 days  │
│    Last resolved: 2 weeks ago       │
│    ⚠ May need permanent fix        │
└─────────────────────────────────────┘
```

**Category Trends Card:**
```
📊 Trends
┌─────────────────────────────────────┐
│ Pothole         ▲ +23% this month    │
│ Water Leak      ▼ -5%               │
│ Garbage         ▲ +12%              │
│ Streetlight     ▼ -8%               │
└─────────────────────────────────────┘
```

---

### Section 5: KPI Summary Cards

Compact overview row at top of analytics screen:

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Total│ │  Res │ │  Avg  │ │Critical│
│  342 │ │ 67%  │ │  48h  │ │   5   │
│ Issues│ │ Rate │ │ Time  │ │  Open  │
└──────┘ └──────┘ └──────┘ └──────┘
```

---

## Chart Components

### Reusable Chart Wrapper
```typescript
interface ChartProps {
  data: SeriesPoint[]
  type: 'line' | 'bar' | 'pie'
  period: '7d' | '30d' | '90d'
  onPointPress?: (point) => void
}
```

### Library Decision
Use `react-native-chart-kit` for MVP (simple, works out of box). If more customization needed, swap to `victory-native`.

---

## API Integration

### Trends
```typescript
const { data } = await supabase.functions.invoke('analytics/trends', {
  method: 'GET',
  query: { department_id, period: '30d', granularity: 'day', metric: 'reported' },
})
```

### Heatmap
```typescript
const { data } = await supabase.functions.invoke('analytics/heatmap', {
  method: 'GET',
  query: { bounds: '12.90,77.55,13.00,77.65', category, status },
})
```

### Predictions
```typescript
const { data } = await supabase.functions.invoke('analytics/predictions', {
  method: 'GET',
})
```

### Department Comparison
```typescript
const { data } = await supabase.functions.invoke('analytics/departments', {
  method: 'GET',
  query: { period: '30d' },
})
```

---

## Realtime Updates

- KPI cards update when new issues are reported or status changes
- Trend charts refresh periodically (manual refresh button)
- Heatmap updates when toggling filters

---

## Loading & Error States

| Component | Loading | Error | Empty |
|---|---|---|---|
| Charts | Shimmer skeleton | "Failed to load chart" + Retry | "No data for this period" |
| Heatmap | Spinner overlay | "Failed to load map data" | "No issues in this area" |
| Predictions | Skeleton cards | "Prediction unavailable" | "Not enough data yet" |
| KPI Cards | Shimmer numbers | "—" | 0 |

---

## Acceptance Criteria
- [ ] Trend charts render with correct data
- [ ] Period picker changes chart data
- [ ] Heatmap overlay shows weighted issue clusters
- [ ] Heatmap filters work (category, status)
- [ ] Predictions section loads hotspots and trends
- [ ] Department comparison shows for super admin
- [ ] KPI cards show correct summary metrics
- [ ] Pull-to-refresh reloads all analytics data
- [ ] Error states handled gracefully
