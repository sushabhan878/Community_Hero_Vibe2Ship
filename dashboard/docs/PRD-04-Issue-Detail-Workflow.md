# PRD-04: Issue Detail & Workflow

## Overview
The full detail view of a single civic issue. Department admins use this page to update status, add notes, view the timeline, see media, and manage the issue lifecycle. Super admins additionally get reassign and delete controls.

---

## Route
`/dashboard/issues/[id]`

---

## Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ← Back to Issues                                              │
│                                                                │
│ Issue #a1b2c3                                    [Actions ▼] │
│ Large pothole on MG Road near HDFC ATM                        │
│ Reported by Rajan M. · 3 days ago · Ward: Shivajinagar       │
│                                                                │
│ ┌──────┬──────────────────────────────────────────────────┐  │
│ │ Info │  Timeline                                         │  │
│ │      │                                                   │  │
│ │ 🔴   │  15m ago — Crew dispatched to location            │  │
│ │ Critical│  ↑ Assigned → In Progress                      │  │
│ │      │                                                   │  │
│ │ 🚧   │  2h ago — Assigned to Roads & Infrastructure     │  │
│ │ In Progress│  ↑ Verified → Assigned                      │  │
│ │      │                                                   │  │
│ │ 🏢   │  5h ago — 5 community verifications reached       │  │
│ │ Roads│  ↑ 5 upvotes milestone                             │  │
│ │      │                                                   │  │
│ │ 👍 12│  6h ago — AI classified: pothole, severity:       │  │
│ │      │            critical, confidence: 94%              │  │
│ │ 📅   │  7h ago — Issue submitted                          │  │
│ │ Jan 15│                                                   │  │
│ │      │                                                   │  │
│ │ 📍   │  [Add Note]  [Change Status ▼]                    │  │
│ │ 12.9716, 77.5946│                                         │  │
│ │      │                                                   │  │
│ │ 🖼️   │  [Image Gallery - 3 photos]                       │  │
│ └──────┴──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Left Panel — Issue Info

### Header Section
| Element | Source |
|---|---|
| Issue ID | Short ID display (last 6 of UUID) + copy button |
| Title | Issue title, editable inline (pending issues only) |
| Reporter | Link to reporter profile (if public profiles implemented) |
| Relative time | "3 days ago" with tooltip showing exact timestamp |
| Ward | If available |

### Metadata Cards

**Status Card**
- Current status with color-coded badge
- Next available transitions as quick-action buttons

**Severity Card**
- Severity level with color
- AI severity vs user severity (if different, show both)

**Category Card**
- Category with icon
- AI category vs user category (if different, show both)

**Department Card**
- Assigned department name
- If super_admin: "Reassign" button opens department picker

**Location Card**
- Read-only lat/lng coordinates
- "View on Map" link (opens in new tab / map modal)
- Address text (if available)

**Community Card**
- Verification count
- "View Verifiers" link to expandable list

### Media Gallery

| Property | Value |
|---|---|
| Layout | Horizontal scrollable strip |
| Thumbnail | 120x120px, rounded, object-fit cover |
| Click | Opens lightbox modal with full-size image |
| Navigation | Left/right arrows in lightbox |
| Keyboard | Escape to close, arrows to navigate |
| Video | Play icon overlay on video thumbnails |

---

## Right Panel — Timeline

### Timeline Entry Format
```
[Time ago] — [Action description]
[ ↑ From → To ]       (for status changes)
[Dept/User name]      (who performed the action)
[Expand ▼]            (for entries with metadata)
```

### Timeline Event Types

| Type | Icon | Display |
|---|---|---|
| `status_change` | ● (color = status) | "Status changed: Pending → AI Processed" |
| `ai_processed` | 🤖 | "AI classified as pothole (94% confidence)" |
| `department_assigned` | 🏢 | "Assigned to Roads & Infrastructure" |
| `note_added` | 💬 | Note text with admin name |
| `verification_milestone` | 👍 | "5 community verifications reached!" |

### Timeline Empty State
- Single entry: "Issue submitted" at the top
- "Waiting for AI processing…" with animated dots

---

## Action Controls

### Change Status Dropdown
Available to: department_admin (their dept's issues) + super_admin

| Current Status | Available Transitions |
|---|---|
| `assigned` | → `in_progress` |
| `in_progress` | → `resolved` |
| `resolved` | → `in_progress` (reopen) |

**Flow:**
1. Click "Change Status" → dropdown appears
2. Select new status → confirmation dialog appears
3. Add optional note (required for `rejected`)
4. Confirm → API call → timeline updates in realtime

### Add Note
Available to: department_admin (their dept's issues) + super_admin

**Flow:**
1. Click "Add Note" → inline textarea expands
2. Type note (max 500 chars, with character counter)
3. Press Enter or click "Post" → API call → note appears in timeline
4. Escape or click outside → cancel

### Reassign (Super Admin Only)
1. "Reassign" button in Department card
2. Opens modal with department dropdown + note field
3. Confirm → API call → timeline entry created

### Issue Actions Menu (top-right overflow menu)

| Action | Role | Behavior |
|---|---|---|
| Delete Issue | Super Admin | Confirmation dialog → soft delete → redirect to `/dashboard/issues` |
| Mark as Duplicate | Super Admin | Opens "Link to original issue" modal |
| Copy Issue ID | Any | Copies full UUID to clipboard with toast "Copied!" |

---

## Confirmation Dialogs

### Status Change Confirmation
```
┌──────────────────────────────────┐
│ Change Status to "In Progress"?   │
│                                   │
│ Optional note:                    │
│ ┌──────────────────────────────┐ │
│ │ Crew dispatched. ETA 2hrs   │ │
│ └──────────────────────────────┘ │
│                        0/500     │
│                                   │
│        [Cancel]    [Confirm]     │
└──────────────────────────────────┘
```

### Delete Confirmation
```
┌────────────────────────────────────┐
│ Delete this issue?                  │
│ This will soft-delete the issue.   │
│ The reporter will be notified.     │
│                                     │
│        [Cancel]    [Delete]         │
└────────────────────────────────────┘
```

---

## Realtime Subscriptions

### Issue Detail Channel
```typescript
supabase
  .channel(`issue-${issueId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'issue_updates',
    filter: `issue_id=eq.${issueId}`
  }, (payload) => {
    prependTimelineEntry(payload.new)
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'issues',
    filter: `id=eq.${issueId}`
  }, (payload) => {
    updateInfoPanel(payload.new)
  })
  .subscribe()
```

---

## Loading States

| State | Behavior |
|---|---|
| Initial load | Skeleton layout matching page structure (info cards + timeline placeholder) |
| Action in progress | Button shows spinner; inputs disabled |
| Realtime update | Timeline entry slides in with subtle highlight |
| Image loading | Blur placeholder → fade in on load |

---

## Error States

| Scenario | UI |
|---|---|
| Issue not found | Full-page error: "Issue not found. It may have been deleted." + "Back to Issues" link |
| Network error | Inline toast: "Failed to update status. Please try again." |
| Permission error | Inline toast: "You don't have permission to perform this action." |
| Image load failure | Broken image placeholder with "Failed to load image" text |

---

## Navigation

- "← Back to Issues" link preserves current filter state (via `document.referrer` or stored search params)
- Breadcrumb: `Dashboard > Issues > [Issue Title]`
- Keyboard shortcut: `Escape` closes modals and lightbox

---

## Acceptance Criteria
- [ ] Issue info panel displays all fields from the API response
- [ ] Timeline shows all events in reverse chronological order
- [ ] New timeline entries appear via Realtime without page refresh
- [ ] Status change: dropdown shows valid transitions only; invalid ones are hidden/disabled
- [ ] Status change creates audit entry + updates info panel in realtime
- [ ] Note addition: textarea + char counter + posts via API
- [ ] Reassign (super_admin): modal with department picker, creates timeline entry
- [ ] Delete: confirmation dialog → soft delete → redirect
- [ ] Image gallery: horizontal scroll, click opens lightbox
- [ ] Loading skeleton matches page layout
- [ ] Issue not found shows error state with back link
- [ ] Image fails gracefully with placeholder
