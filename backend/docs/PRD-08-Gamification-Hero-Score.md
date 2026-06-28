# PRD-08: Gamification & Hero Score

## Overview
Hero Score and badges incentivize citizens to report accurately, verify honestly, and stay engaged. Every civic action earns points. Badges mark milestones. A leaderboard shows top contributors per city/ward.

---

## Hero Score Events

| Action | Points | Condition |
|---|---|---|
| Submit a report | +10 | On issue insert |
| Report verified by 5+ citizens | +15 | When issue hits `verified` status |
| Report resolved | +25 | When issue hits `resolved` status |
| Give a verification | +2 | On each verification insert |
| Remove a verification | -2 | On verification delete (floor: 0) |
| First report in a ward (today) | +20 | First issue in that ward for the calendar day |
| Badge earned | +0 (badges are the reward) | — |

**Floor:** Hero score cannot go below 0.

---

## Edge Function: `award-hero-score`

Internal helper called by other functions. Never called directly by clients.

```typescript
interface AwardInput {
  user_id: string;
  points: number;        // positive = add, negative = deduct
  reason: string;        // for logging
  issue_id?: string;     // context
}

async function awardHeroScore(input: AwardInput) {
  // Atomic increment using Postgres function to avoid race conditions
  await supabase.rpc('increment_hero_score', {
    p_user_id: input.user_id,
    p_points: input.points
  });

  // Check badge eligibility after every score change
  await checkAndAwardBadges(input.user_id);
}
```

```sql
-- Atomic increment, floor at 0
CREATE OR REPLACE FUNCTION increment_hero_score(p_user_id uuid, p_points integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET hero_score = GREATEST(0, hero_score + p_points)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Badge System

### Badge Definitions

| Badge Slug | Name | Criteria | Points Awarded |
|---|---|---|---|
| `first_report` | First Responder | Submit your first issue | Awarded once |
| `neighborhood_watch` | Neighborhood Watch | Submit 10 issues | Awarded once |
| `community_pillar` | Community Pillar | Give 50 verifications | Awarded once |
| `problem_solver` | Problem Solver | 5 of your reports get resolved | Awarded once |
| `speed_reporter` | Speed Reporter | Report within 1hr of an issue's first appearance (same location cluster) | Awarded once |
| `top_hero` | City Hero | Rank in top 10 on leaderboard at any point | Awarded once |
| `verified_reporter` | Verified Reporter | 3 of your reports reach `verified` status | Awarded once |
| `super_verifier` | Super Verifier | Give 10 verifications in a single day | Awarded once |

---

### Badge Award Logic

```typescript
async function checkAndAwardBadges(userId: string) {
  const [profile, existingBadges] = await Promise.all([
    supabase.from('profiles')
      .select('hero_score, total_reports, total_resolved, total_verified, created_at')
      .eq('id', userId)
      .single(),
    supabase.from('badges')
      .select('slug')
      .eq('user_id', userId)
  ]);

  const awarded = new Set(existingBadges.data?.map(b => b.slug));

  const toAward: string[] = [];

  // first_report
  if (!awarded.has('first_report') && profile.data.total_reports >= 1)
    toAward.push('first_report');

  // neighborhood_watch
  if (!awarded.has('neighborhood_watch') && profile.data.total_reports >= 10)
    toAward.push('neighborhood_watch');

  // community_pillar
  if (!awarded.has('community_pillar') && profile.data.total_verified >= 50)
    toAward.push('community_pillar');

  // problem_solver
  if (!awarded.has('problem_solver') && profile.data.total_resolved >= 5)
    toAward.push('problem_solver');

  // verified_reporter: count issues with status = verified or beyond
  if (!awarded.has('verified_reporter')) {
    const { count } = await supabase.from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', userId)
      .in('status', ['verified', 'assigned', 'in_progress', 'resolved', 'closed']);
    if ((count ?? 0) >= 3) toAward.push('verified_reporter');
  }

  // super_verifier: 10 verifications today
  if (!awarded.has('super_verifier')) {
    const { count } = await supabase.from('verifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString());
    if ((count ?? 0) >= 10) toAward.push('super_verifier');
  }

  if (toAward.length === 0) return;

  // Insert badges
  await supabase.from('badges').insert(
    toAward.map(slug => ({ user_id: userId, slug }))
  );

  // Notify for each badge
  for (const slug of toAward) {
    await sendNotification(userId, {
      type: 'badge_earned',
      title: 'Badge Earned! 🏅',
      body: `You earned the "${BADGE_NAMES[slug]}" badge!`,
    });
  }
}
```

---

## Leaderboard

### `GET /leaderboard`
**Auth required:** Yes

**Query Parameters:**
```
scope     string    "city" | "ward"     default: "city"
ward      string    required if scope = "ward"
period    string    "all_time" | "this_month" | "this_week"   default: "all_time"
limit     int       default: 10, max: 50
```

**Logic:**
- `all_time`: order by `profiles.hero_score DESC`
- `this_month` / `this_week`: requires a `hero_score_history` table or computed from events — for MVP, use `all_time` only
- Include the current user's rank even if not in top N (extra query)

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "user": {
          "id": "uuid",
          "name": "Priya Sharma",
          "avatar_url": "...",
          "hero_score": 1240,
          "total_reports": 48,
          "total_resolved": 31,
          "badges": ["first_report", "neighborhood_watch", "problem_solver"]
        }
      },
      { "rank": 2, "user": { ... } }
    ],
    "my_rank": {
      "rank": 24,
      "hero_score": 180,
      "percentile": 85
    },
    "total_participants": 312
  }
}
```

**My rank query:**
```sql
SELECT rank FROM (
  SELECT id, RANK() OVER (ORDER BY hero_score DESC) as rank
  FROM profiles WHERE deleted_at IS NULL
) ranked WHERE id = $user_id;
```

---

### `GET /profile/:id/stats`
**Auth required:** Yes

Public profile stats for any user.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Rajan Mehta",
      "avatar_url": "...",
      "hero_score": 250,
      "total_reports": 12,
      "total_resolved": 8,
      "total_verified": 30,
      "rank": 24,
      "badges": [
        { "slug": "first_report", "name": "First Responder", "awarded_at": "..." },
        { "slug": "neighborhood_watch", "name": "Neighborhood Watch", "awarded_at": "..." }
      ],
      "recent_issues": [
        { "id": "uuid", "title": "...", "status": "resolved", "category": "pothole" }
      ],
      "member_since": "2025-01-01T00:00:00Z"
    }
  }
}
```

---

## Score Award Trigger Points (where in codebase each is called)

| Points | Called From | When |
|---|---|---|
| +10 | `POST /issues` handler | After successful insert |
| +15 | `PRD-06 status handler` | On transition to `verified` |
| +25 | `PRD-06 status handler` | On transition to `resolved` |
| +2 | `POST /issues/:id/verify` | After verification insert |
| -2 | `DELETE /issues/:id/verify` | After verification delete |
| +20 | `POST /issues` handler | If first in ward today (checked via query) |

```typescript
// First in ward check (in POST /issues)
const { count } = await supabase.from('issues')
  .select('id', { count: 'exact', head: true })
  .eq('ward', issue.ward)
  .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
  .neq('id', newIssue.id); // exclude the one just created

if (count === 0 && issue.ward) {
  await awardHeroScore({ user_id: userId, points: 20, reason: 'first_in_ward', issue_id: newIssue.id });
}
```

---

## Acceptance Criteria
- [ ] New issue → reporter gets +10 hero score immediately
- [ ] Issue reaches `verified` → reporter gets +15
- [ ] Issue reaches `resolved` → reporter gets +25
- [ ] Verification given → verifier gets +2
- [ ] Verification removed → verifier loses 2 (floor: 0)
- [ ] First issue in ward today → reporter gets +20 (only once per ward per day)
- [ ] `first_report` badge awarded on first issue submission
- [ ] `neighborhood_watch` badge awarded at 10 total reports
- [ ] Badge award fires push notification
- [ ] `top_hero` badge logic executes (daily cron or on leaderboard refresh)
- [ ] Leaderboard returns correctly ranked users with badge previews
- [ ] `my_rank` returns current user's position even when not in top 10
- [ ] Score increment is atomic (no race conditions under concurrent updates)
- [ ] Badges are idempotent — awarded at most once per user per slug
