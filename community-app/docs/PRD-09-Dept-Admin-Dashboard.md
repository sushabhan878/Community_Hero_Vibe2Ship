# PRD-09: Department Admin Dashboard

## Overview
A dedicated dashboard for department admins and super admins to manage issues assigned to their department. Provides KPI cards, an issues management table, and quick-action controls.

---

## Screen: Admin Dashboard (`admin/index.tsx`)

### Access Control
- Route guard: redirect to feed if `role` is not `department_admin` or `super_admin`
- Super admin sees all departments; dept admin sees only their department's data

### KPI Cards Row

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Total │ │ Open │ │ In    │ │ Res. │
│  42   │ │  18  │ │Progress│ │ Rate │
│ Issues│ │      │ │   5   │ │  57% │
└──────┘ └──────┘ └──────┘ └──────┘
```

**Cards:**
1. Total Issues (all time)
2. Open Issues (pending + ai_processed + verified + assigned)
3. In Progress (currently being worked on)
4. Resolution Rate (% of resolved vs total assigned)
5. Critical Open (red highlight if > 0)
6. Avg Resolution Time (in hours)

**Behavior:**
- Cards are tappable → filter the issues table below
- Refresh via pull-to-refresh
- Loading state: shimmer card skeletons

---

### Quick Actions Bar

```
[Assign to Me] [Mark In Progress] [Mark Resolved] [Add Note]
```

- Context-aware: actions enabled only when issues are selected
- "Assign to Me": batch assign selected issues to current admin's department
- "Mark In Progress": batch change status of selected issues
- "Mark Resolved": batch resolve (with optional note modal)
- "Add Note": text input modal, appended to selected issues

---

### Issues Management Table

```
┌────────────────────────────────────────────────────┐
│ Search...                          [Status ▼] [Sort ▼]│
├────┬────────────┬─────────┬───────┬───────┬────────┤
│ ☐  │ Title      │ Status  │ Sev   │ Verif │ Age    │
│ ☑  │ Pothole... │ In Prog │ High  │ 5     │ 3d     │
│ ☐  │ Water...   │ Assigned│ Crit  │ 12    │ 1d     │
│ ... │            │         │       │       │        │
└────┴────────────┴─────────┴───────┴───────┴────────┘
```

**Columns:**
| Column | Detail |
|---|---|
| ☐ | Checkbox (multi-select) |
| Title | First 50 chars, tap → issue detail modal |
| Status | Color-coded badge |
| Severity | Color-coded badge |
| Verifications | Count (highlight if ≥ 5) |
| Age | Days since creation |
| Days Open | Computed: now - created_at |
| Reporter | Name (tap → profile) |

**Features:**
- Sort by any column (tap header)
- Filter by status, severity, category
- Search by title
- Pagination (20 per page)
- Bulk select with checkbox column
- Desktop-like data table experience (horizontal scroll if needed)

---

### Issue Detail Modal (from table tap)

```
┌─────────────────────────────────────┐
│ Close (X)                    [Actions ▼]
├─────────────────────────────────────┤
│ Title: Large pothole on MG Road     │
│ Status: In Progress     Severity: High
│ Reported: 3 days ago by Rajan M.    │
│ Verifications: 5                    │
│ Dept: Roads & Infrastructure        │
├─────────────────────────────────────┤
│ [Image thumbnail]                   │
│ Description: ...                    │
├─────────────────────────────────────┤
│ Timeline (last 5 entries)           │
│ ● Assigned   Jan 15, 10:30         │
│ ● AI Process Jan 15, 10:28         │
│ ● Pending    Jan 15, 10:25         │
├─────────────────────────────────────┤
│ Action Buttons:                     │
│ [Mark In Progress] [Resolve] [Note] │
└─────────────────────────────────────┘
```

---

### Status Change Bottom Sheet

When admin taps a status action:

```
┌─────────────────────────────┐
│ Change Status               │
│                             │
│ Current: In Progress        │
│                             │
│ [Mark as Resolved]          │
│                             │
│ Note (optional):            │
│ ┌─────────────────────┐    │
│ │ Crew dispatched at   │    │
│ │ 10:30 AM. Filled the │    │
│ │ pothole with fresh   │    │
│ │ asphalt.             │    │
│ └─────────────────────┘    │
│              [Confirm]     │
└─────────────────────────────┘
```

---

## Super Admin Features

### Department Filter
- Dropdown at top to switch between departments
- "All Departments" option (see cross-department metrics)

### User Management
- List of department admins per department
- Add new dept admin button → form modal
- Disable user button (with confirmation)

---

## API Integration

### Dashboard KPI
```typescript
const { data } = await supabase.functions.invoke('analytics/overview', {
  method: 'GET',
  query: { department_id, period: '30d' },
})
```

### Issues Table
```typescript
const { data } = await supabase.functions.invoke('analytics/issues-table', {
  method: 'GET',
  query: { page, limit, status, severity, search, sort_by, sort_order },
})
```

---

## Realtime Updates

- Subscribe to `issues` table UPDATE for assigned department
- New issues appear in table without refresh
- Status changes from other admins reflect immediately
- KPI cards update when counts change

---

## Acceptance Criteria
- [ ] KPI cards load with correct counts
- [ ] Issues table loads with pagination
- [ ] Sort and filter work on all columns
- [ ] Bulk select + batch actions work
- [ ] Status change updates issue and shows in table
- [ ] Add note appends to issue timeline
- [ ] Super admin can filter by department
- [ ] Realtime updates reflect in table and KPIs
- [ ] Pull-to-refresh reloads all data
