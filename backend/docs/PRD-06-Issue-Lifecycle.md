# PRD-06: Issue Status & Lifecycle Management

## Overview
Defines the complete lifecycle of an issue from submission to closure, who can move it between states, the valid state transitions, and the audit trail. Department admins drive the middle/end lifecycle; the AI pipeline drives early transitions.

---

## Status State Machine

```
                    [AI rejected / duplicate]
         ┌─────────────────────────────────────────→ rejected
         │
pending ──→ ai_processed ──→ verified ──→ assigned ──→ in_progress ──→ resolved ──→ closed
                │                             ↑               │
                └─────────────────────────────┘               └──→ (auto-closed after 7 days)
              (auto-assign on AI process)
```

**Transition Table:**

| From | To | Who | Condition |
|---|---|---|---|
| `pending` | `ai_processed` | System (AI) | AI successfully processed |
| `pending` | `rejected` | System (AI) | Invalid issue or duplicate |
| `ai_processed` | `verified` | System (trigger) | 5+ verifications |
| `ai_processed` | `assigned` | Super Admin | Manual override |
| `verified` | `assigned` | Super Admin | Manual department change |
| `assigned` | `in_progress` | Department Admin | Dept acknowledges the issue |
| `in_progress` | `resolved` | Department Admin | Work complete |
| `resolved` | `closed` | System (cron) | Auto-close 7 days after resolution |
| `resolved` | `in_progress` | Department Admin | Reopened (issue recurred) |
| `any` | `rejected` | Super Admin | Spam/invalid override |

**Invalid Transitions** (return `INVALID_TRANSITION` error):
- Any backward transition not listed above
- Citizen changing any status
- Department admin moving outside their scope

---

## Endpoints

### `PATCH /issues/:id/status`
**Auth required:** Yes (department_admin or super_admin)

The primary status-change endpoint for department staff.

**Request Body:**
```json
{
  "status": "in_progress",
  "note": "Crew dispatched to location, expected completion by Friday."
}
```

**Logic:**
1. Fetch issue with current status and assigned department
2. Verify caller has permission for this transition (see matrix above)
3. Validate transition is legal per state machine
4. For department_admin: verify `issues.assigned_department_id = profile.department_id`
5. Update `issues.status` (and `resolved_at` if transitioning to `resolved`)
6. Insert `issue_updates` audit record
7. If `resolved`: update `profiles.total_resolved` for reporter, award hero score +25
8. Notify reporter of status change
9. If transitioning to `in_progress`: notify all verifiers (they cared enough to verify)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "issue-uuid",
    "status": "in_progress",
    "updated_at": "2025-01-16T09:00:00Z",
    "timeline_entry": {
      "type": "status_change",
      "old_status": "assigned",
      "new_status": "in_progress",
      "note": "Crew dispatched to location...",
      "created_at": "..."
    }
  }
}
```

**Error Cases:**
| Code | Trigger |
|---|---|
| `INVALID_TRANSITION` | Transition not allowed per state machine |
| `WRONG_DEPARTMENT` | Dept admin trying to update another dept's issue |
| `FORBIDDEN` | Citizen trying to change status |
| `NOTE_REQUIRED` | `rejected` transitions must include a note |

---

### `POST /issues/:id/notes`
**Auth required:** Yes (department_admin, super_admin)

Add a note/comment to an issue without changing status. Useful for progress updates.

**Request Body:**
```json
{
  "note": "Materials ordered, work begins Monday morning."
}
```

**Logic:**
1. Verify caller has access to this issue (dept admin → same dept)
2. Insert `issue_updates` with `type = 'note_added'`, no status fields
3. Notify reporter

**Response:**
```json
{
  "success": true,
  "data": {
    "update": {
      "id": "uuid",
      "type": "note_added",
      "note": "Materials ordered...",
      "updated_by": { "name": "Suresh Kumar", "role": "department_admin" },
      "created_at": "..."
    }
  }
}
```

---

### `PATCH /issues/:id/assign`
**Auth required:** Yes (super_admin only)

Manually reassign an issue to a different department.

**Request Body:**
```json
{
  "department_id": "uuid-of-new-dept",
  "note": "Rerouting to Water dept — the pothole has exposed a pipe."
}
```

**Logic:**
1. Verify caller is `super_admin`
2. Verify department exists and is active
3. Update `issues.assigned_department_id` and `assigned_at`
4. Update `issues.status` to `assigned` if it was `verified` or `ai_processed`
5. Insert audit record with `type = 'department_assigned'`
6. Notify new department's admins
7. Notify reporter of department change

---

### `GET /issues/:id/timeline`
**Auth required:** Yes

Returns the full ordered audit trail for an issue.

**Response:**
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "id": "uuid",
        "type": "status_change",
        "old_status": null,
        "new_status": "pending",
        "note": null,
        "updated_by": { "id": "uuid", "name": "Rajan M.", "role": "citizen" },
        "metadata": {},
        "created_at": "2025-01-15T10:30:00Z"
      },
      {
        "id": "uuid",
        "type": "ai_processed",
        "note": "AI classified: pothole, severity: critical, confidence: 94%",
        "updated_by": { "name": "Community Hero AI", "role": "system" },
        "metadata": {
          "ai_category": "pothole",
          "ai_severity": "critical",
          "ai_confidence": 0.94,
          "department_assigned": "Roads & Infrastructure"
        },
        "created_at": "2025-01-15T10:30:15Z"
      },
      {
        "id": "uuid",
        "type": "verification_milestone",
        "note": "5 community verifications reached",
        "created_at": "2025-01-15T14:00:00Z"
      },
      {
        "id": "uuid",
        "type": "status_change",
        "old_status": "verified",
        "new_status": "in_progress",
        "note": "Crew dispatched to location, expected completion by Friday.",
        "updated_by": { "name": "Suresh Kumar", "role": "department_admin" },
        "created_at": "2025-01-16T09:00:00Z"
      }
    ]
  }
}
```

---

## Auto-Close Cron Job

**Function:** `auto-close-issues` (Supabase Edge Function via pg_cron)
**Schedule:** Daily at 02:00 UTC

```typescript
// Close issues resolved more than 7 days ago
const { data: toClose } = await supabase
  .from('issues')
  .select('id, reporter_id')
  .eq('status', 'resolved')
  .lt('resolved_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  .is('deleted_at', null);

for (const issue of toClose) {
  await supabase.from('issues').update({
    status: 'closed',
    updated_at: new Date().toISOString()
  }).eq('id', issue.id);

  await supabase.from('issue_updates').insert({
    issue_id: issue.id,
    updated_by: issue.reporter_id,
    type: 'status_change',
    old_status: 'resolved',
    new_status: 'closed',
    note: 'Issue automatically closed after 7 days.',
    metadata: { auto_closed: true }
  });
}
```

**pg_cron setup:**
```sql
SELECT cron.schedule('auto-close-issues', '0 2 * * *',
  $$SELECT net.http_post(url := 'https://<project>.functions.supabase.co/auto-close-issues',
    headers := '{"Authorization": "Bearer <service_role_key>"}') $$
);
```

---

## Status-Based Access Rules (summary)

| Status | Citizen | Dept Admin (assigned dept) | Super Admin |
|---|---|---|---|
| `pending` | Edit title/desc | — | Delete, reject |
| `ai_processed` | Verify | — | Assign, reject |
| `verified` | Unverify | → in_progress | Reassign, reject |
| `assigned` | — | → in_progress | Reassign |
| `in_progress` | — | Add note, → resolved | Reassign |
| `resolved` | — | → in_progress (reopen) | Reopen |
| `rejected` | — | — | Restore |
| `closed` | — | — | — |

---

## Acceptance Criteria
- [ ] Valid transition: status changes, audit record created, reporter notified
- [ ] Invalid transition: returns `INVALID_TRANSITION`, no DB changes made
- [ ] Dept admin cannot update issues assigned to another department
- [ ] `resolved` → `profiles.total_resolved++` for reporter
- [ ] `resolved` → reporter gets +25 hero score
- [ ] Auto-close cron changes `resolved` → `closed` after exactly 7 days
- [ ] Timeline endpoint returns entries in chronological order
- [ ] Note addition creates audit entry without changing status
- [ ] Super admin can reassign between departments; both depts get notified
- [ ] `rejected` transitions require a non-empty note
