# PRD-05: Community Verification System

## Overview
Citizens can upvote/verify issues they witness in-person, adding credibility and urgency. Reaching the verification threshold (5 verifications) automatically upgrades the issue status. This drives community participation and helps filter out false reports.

---

## Business Rules

| Rule | Detail |
|---|---|
| One verification per user per issue | Enforced via DB UNIQUE constraint |
| Cannot verify own issue | Enforced in RLS + Edge Function |
| Cannot verify rejected issues | Enforced in Edge Function |
| Cannot verify resolved/closed issues | Enforced in Edge Function |
| Verification threshold | 5 verifications → status moves to `verified` |
| Verified issues get priority routing | Department dashboard shows verified issues at top |
| Unverify (remove vote) | Allowed anytime before issue is `in_progress` |

---

## Endpoints

### `POST /issues/:id/verify`
**Auth required:** Yes (citizen)

**Logic:**
1. Fetch issue — check it exists and is not deleted
2. Validate `status` is one of: `ai_processed`, `verified` — reject others with clear message
3. Check `reporter_id != auth.uid()` — cannot verify own issue
4. Check no existing verification row for `(issue_id, auth.uid())`
5. Insert into `verifications`
6. DB trigger handles:
   - `issues.verification_count++`
   - Status upgrade to `verified` if count reaches 5
   - `profiles.total_verified++` for the verifier
7. Award `+2` hero score to verifier (via `award-hero-score` helper)
8. If verification_count hits milestone (5, 10, 25, 50): insert `issue_updates` record of type `verification_milestone`
9. At exactly count = 5 (threshold): notify reporter

**Response:**
```json
{
  "success": true,
  "data": {
    "verification_count": 6,
    "has_verified": true,
    "status": "verified",
    "hero_points_earned": 2
  }
}
```

**Error Cases:**
| Code | Trigger |
|---|---|
| `ALREADY_VERIFIED` | User already verified this issue |
| `CANNOT_VERIFY_OWN` | Reporter trying to verify their own issue |
| `ISSUE_NOT_VERIFIABLE` | Status is pending / rejected / resolved / closed |
| `ISSUE_NOT_FOUND` | Issue doesn't exist or is deleted |

---

### `DELETE /issues/:id/verify`
**Auth required:** Yes (citizen)

Removes the user's verification (unverify/undo upvote).

**Logic:**
1. Fetch issue — check status is NOT `in_progress`, `resolved`, or `closed` (cannot unverify after dept acknowledges)
2. Delete row from `verifications` where `(issue_id, user_id) = (id, auth.uid())`
3. If no row found: return `NOT_VERIFIED` error
4. Decrement `issues.verification_count`
5. If count falls below 5 and status is `verified` → revert to `ai_processed`
6. Decrement `profiles.total_verified` for the user
7. Deduct `2` hero score (cannot go below 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "verification_count": 4,
    "has_verified": false,
    "status": "ai_processed"
  }
}
```

**Error Cases:**
| Code | Trigger |
|---|---|
| `NOT_VERIFIED` | User hasn't verified this issue |
| `CANNOT_UNVERIFY_AFTER_PROGRESS` | Status is in_progress or later |

---

### `GET /issues/:id/verifications`
**Auth required:** Yes

Returns who verified this issue (public info, not sensitive).

**Query Parameters:**
```
page    int   default: 1
limit   int   default: 20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verifications": [
      {
        "user": { "id": "uuid", "name": "Priya S.", "avatar_url": "..." },
        "created_at": "2025-01-15T11:00:00Z"
      }
    ],
    "total": 7,
    "has_verified": true
  }
}
```

---

## Verification Milestone Notifications

Milestones that trigger events:

| Count | Event |
|---|---|
| 5 | Issue status → `verified`. Reporter notified: "5 citizens confirmed your issue!" |
| 10 | Insert milestone audit log. Reporter notified: "10 verifications!" |
| 25 | Insert milestone audit log. Reporter notified: "25 verifications — your issue is trending!" |
| 50 | Insert milestone audit log. Reporter notified: "50 verifications! This is a community priority." |

```typescript
async function checkAndFireMilestones(issueId: string, newCount: number, reporterId: string) {
  const milestones = [5, 10, 25, 50];
  if (!milestones.includes(newCount)) return;

  await supabase.from('issue_updates').insert({
    issue_id: issueId,
    updated_by: reporterId,
    type: 'verification_milestone',
    note: `${newCount} community verifications reached`,
    metadata: { count: newCount }
  });

  const messages: Record<number, string> = {
    5: '5 citizens confirmed your issue. It\'s now officially verified!',
    10: '10 verifications! Your issue is getting noticed.',
    25: '25 verifications — this issue is trending in your area.',
    50: '50 verifications! Your report has become a community priority.'
  };

  await sendNotification(reporterId, {
    type: 'verification_milestone',
    title: `${newCount} Verifications!`,
    body: messages[newCount],
    issue_id: issueId
  });
}
```

---

## Anti-Abuse Measures

### Rate Limiting on Verifications
- Max 20 verifications per user per hour (prevents bot-like voting)
- Checked via: `SELECT count(*) FROM verifications WHERE user_id = $uid AND created_at > now() - interval '1 hour'`

### Geographic Validation (Optional Enhancement)
- For issues where reporter provided location, verify that the verifying user's approximate location (from their IP or submitted location) is within 2km of the issue
- This is soft enforcement — show a warning on mobile, don't hard block
- Stored in `verifications.metadata` for analysis

### New Account Restriction
- Accounts created less than 24 hours ago cannot submit verifications
- Prevents spam accounts from manipulating verification counts

```typescript
const { data: profile } = await supabase.from('profiles').select('created_at').eq('id', auth.uid).single();
const accountAge = Date.now() - new Date(profile.created_at).getTime();
if (accountAge < 24 * 60 * 60 * 1000) {
  return error('ACCOUNT_TOO_NEW', 'You must have an account for 24 hours before verifying issues');
}
```

---

## DB Trigger (from PRD-01, restated here for clarity)

```sql
CREATE OR REPLACE FUNCTION on_verification_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment denormalized count
  UPDATE issues SET verification_count = verification_count + 1
  WHERE id = NEW.issue_id;

  -- Status upgrade at threshold
  UPDATE issues SET status = 'verified'
  WHERE id = NEW.issue_id
    AND status = 'ai_processed'
    AND verification_count >= 5;

  -- Increment verifier stats
  UPDATE profiles SET total_verified = total_verified + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Acceptance Criteria
- [ ] Second verification from same user returns `ALREADY_VERIFIED`
- [ ] Reporter cannot verify their own issue
- [ ] 5th verification: issue status changes to `verified`, reporter notified
- [ ] Unverify works and decrements count correctly
- [ ] Unverify below threshold: status reverts to `ai_processed`
- [ ] Cannot unverify after status is `in_progress` or later
- [ ] Milestone notifications fire at 5, 10, 25, 50
- [ ] Rate limit: 21st verification in 1 hour is rejected
- [ ] Account < 24h old cannot verify
- [ ] Hero score +2 on verify, -2 on unverify (floor: 0)
