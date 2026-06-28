# PRD-05: Issue Detail & Lifecycle

## Overview
Full-screen detail view of a single issue. Shows media gallery, AI analysis results, status timeline, verification controls, and actions based on user role.

---

## Screen: Issue Detail (`issue/[id].tsx`)

### Layout (ScrollView)

```
┌─────────────────────────────────┐
│ [Image Gallery - full width]    │
│  ● ● ○ ○ ○  (dot indicators)   │
├─────────────────────────────────┤
│ Category Badge  Severity Badge  │
│ Status Badge                    │
├─────────────────────────────────┤
│ Title (heading)                 │
│ Description (body text)         │
├─────────────────────────────────┤
│ Location: Address               │
│ [Map thumbnail - static]        │
├─────────────────────────────────┤
│ AI Analysis (if available)      │
│   AI Summary                    │
│   Confidence: 94%               │
│   AI Category → Dept            │
├─────────────────────────────────┤
│ Reporter Info                   │
│   Avatar + Name + Hero Score    │
├─────────────────────────────────┤
│ Verification Section            │
│   [Verify] button / count       │
│   "N citizens confirmed"        │
├─────────────────────────────────┤
│ Timeline                        │
│   ● Pending         10:30 AM    │
│   ● AI Processed    10:32 AM    │
│   ● Verified        10:45 AM    │
│   ● In Progress     11:00 AM    │
└─────────────────────────────────┘
```

---

### Image Gallery

- Full-width image with aspect ratio preservation
- Swipeable horizontal pager
- Pinch-to-zoom on individual images
- Tap to full-screen (modal overlay)
- Dot indicators for multiple images
- Video: show play button overlay, tap to play inline

---

### Status Badge

| Status | Color | Icon |
|---|---|---|
| Pending | Gray | clock-outline |
| AI Processed | Blue | robot-outline |
| Verified | Green | shield-check |
| Assigned | Amber | account-hard-hat |
| In Progress | Amber | wrench |
| Resolved | Green | checkmark-circle |
| Rejected | Red | close-circle |
| Closed | Gray | archive |

---

### AI Analysis Section (collapsible)

**Shown when `ai_processed_at` is set:**

- **AI Summary**: "Large pothole approximately 30cm wide obstructing traffic."
- **Confidence**: Progress bar + percentage
- **Detected Category**: Icon + label (may differ from user's selection)
- **Detected Severity**: Color-coded badge
- **Assigned Department**: Name + contact info
- **Duplicate Warning** (if applicable): "This issue may be a duplicate of [linked issue]"

---

### Verification Section

**For Reporter (own issue):**
- Show verification count with message: "N neighbors confirmed your report"
- Cannot verify own issue (button hidden / disabled)

**For Other Citizens:**
- Verify button with current count
- Tap → POST to `/issues/:id/verify`
- Animate count increment (+1 with bounce)
- Show "Verified!" state (green check, disabled button)
- Unverify option (tap again to remove)

**For Dept Admin:**
- See verification count as credibility metric
- Issues with 5+ verifications shown with "Community Verified" badge

---

### Timeline

- Chronological list of `issue_updates` from `GET /issues/:id/timeline`
- Each item shows:
  - Icon (by `update_type`)
  - Label (human-readable status name)
  - Note (if any)
  - Timestamp (relative)

**Update Types:**
| Type | Icon | Label |
|---|---|---|
| status_change | arrow-right-circle | Status changed from X to Y |
| department_assigned | account-hard-hat | Assigned to Roads Dept |
| note_added | note-text | Note added |
| ai_processed | robot | AI analyzed this issue |
| verification_milestone | account-group | 5 Verifications! |

---

### Department Admin Actions

**Shown when user role = `department_admin`:**
- **Change Status** button → bottom sheet with valid transitions:
  - AI Processed → Assigned
  - Assigned → In Progress
  - In Progress → Resolved
  - (with optional note)
- **Add Note** button → text input modal
- Contact reporter button (if needed)

**Status Transition Validation (client-side):**
```
pending → (no admin action)
ai_processed → [assigned, rejected]
verified → [assigned, rejected]
assigned → [in_progress, rejected]
in_progress → [resolved]
resolved → (no admin action)
rejected → (no admin action)
closed → (no admin action)
```

---

### Super Admin Actions

- **Reassign Department** → department picker modal
- **Delete Issue** (soft delete) → confirmation dialog
- **Toggle User Status** → ban/unban reporter

---

### Share Action

- Share button in header → native share sheet with issue URL / deep link
- Content: "Help fix this issue: {title} — Community Hero"

---

## API Integration

### Fetch Issue
```typescript
const { data } = await supabase.functions.invoke(`issues/${id}`, {
  method: 'GET',
})
```

### Change Status (Dept Admin)
```typescript
const { data } = await supabase.functions.invoke(`issues/${id}/status`, {
  method: 'PATCH',
  body: { status: 'in_progress', note: 'Crew dispatched' },
})
```

---

## Loading & Error States

| State | UI |
|---|---|
| Loading | Shimmer skeleton (full page) |
| Error | Error illustration + "Retry" button |
| Deleted | "This issue has been removed" message |
| Not found | 404 illustration + "Go back" button |

---

## Deep Linking

- Push notification with `data.issue_id` → navigate to `issue/[id]`
- QR code scan → navigate to `issue/[id]`

---

## Acceptance Criteria
- [ ] Issue detail loads with all sections
- [ ] Image gallery swipes and zooms
- [ ] Status badge matches current status color
- [ ] AI analysis section shows correctly or is hidden
- [ ] Verify button works (insert and remove)
- [ ] Timeline shows all updates in order
- [ ] Dept admin can change status with valid transitions
- [ ] Super admin can reassign department
- [ ] Share action opens native share sheet
- [ ] Deep link from notification opens correct issue
