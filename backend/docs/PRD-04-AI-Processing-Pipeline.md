# PRD-04: AI Processing Pipeline

## Overview
After an issue is submitted, a Supabase Edge Function calls Google Gemini 2.5 Flash Vision to automatically categorize the issue, estimate severity, generate a summary, detect duplicates, and route the issue to the correct department — all without human intervention.

---

## Trigger

The `process-issue` Edge Function is invoked in two ways:

1. **Async call from `POST /issues`** — fire-and-forget immediately after issue insert
2. **Webhook from Supabase Database** — `INSERT` on `issues` table (backup trigger, handles missed async calls)

```
Supabase DB Webhook:
  Table: issues
  Event: INSERT
  Function: process-issue
  Filter: status = 'pending'
```

---

## Edge Function: `process-issue`

### Input
```json
{ "issue_id": "uuid" }
```

### Full Processing Pipeline

```
Step 1: Fetch issue data
Step 2: Download image from Storage
Step 3: Call Gemini Vision API
Step 4: Parse AI response
Step 5: Duplicate detection (PostGIS query)
Step 6: Department routing
Step 7: Update issue record
Step 8: Create audit log entry
Step 9: Trigger notifications
```

---

### Step 1: Fetch Issue
```typescript
const { data: issue } = await supabase
  .from('issues')
  .select('*, reporter:profiles(id, name)')
  .eq('id', issue_id)
  .single();

// Guard: skip if already processed
if (issue.status !== 'pending') return;
```

---

### Step 2: Download Image
```typescript
// Download first image (primary analysis image)
const { data: imageData } = await supabase.storage
  .from('issue-media')
  .download(issue.image_urls[0]);

const base64Image = Buffer.from(await imageData.arrayBuffer()).toString('base64');
const mimeType = 'image/webp'; // we always convert to webp on upload
```

---

### Step 3: Gemini Vision Call

**Model:** `gemini-2.5-flash`
**API:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

**System Prompt:**
```
You are an AI assistant for a civic issue management platform. 
Analyze the provided image and the user's description to classify the civic issue.
Always respond with valid JSON only. No markdown, no explanation outside JSON.
```

**User Prompt:**
```
Analyze this civic issue report and respond with JSON only.

User's title: "${issue.title}"
User's description: "${issue.description}"
User's category: "${issue.category}"
User's severity: "${issue.severity}"

Respond with this exact JSON structure:
{
  "category": one of [pothole, road_damage, water_leak, sewage, streetlight, garbage, illegal_dumping, fallen_tree, park_damage, other],
  "severity": one of [low, medium, high, critical],
  "confidence": float between 0 and 1,
  "summary": "one sentence description of what you see, max 100 chars",
  "is_valid_civic_issue": true or false,
  "rejection_reason": "only if is_valid_civic_issue is false, explain why",
  "estimated_resolution_days": integer estimate of how long this typically takes to fix
}

Severity guide:
- critical: immediate safety hazard (deep pothole on highway, live wire, sewage overflow)
- high: significant inconvenience or growing hazard  
- medium: moderate issue, can wait a few days
- low: minor cosmetic issue
```

---

### Step 4: Parse AI Response

```typescript
const responseText = geminiResponse.candidates[0].content.parts[0].text;

let aiResult;
try {
  aiResult = JSON.parse(responseText);
} catch {
  // Gemini sometimes wraps in markdown — strip backticks
  const cleaned = responseText.replace(/```json|```/g, '').trim();
  aiResult = JSON.parse(cleaned);
}

// Validate required fields
const validCategories = ['pothole', 'road_damage', 'water_leak', ...];
const validSeverities = ['low', 'medium', 'high', 'critical'];

if (!validCategories.includes(aiResult.category)) aiResult.category = issue.category;
if (!validSeverities.includes(aiResult.severity)) aiResult.severity = issue.severity;
if (typeof aiResult.confidence !== 'number') aiResult.confidence = 0.5;
```

---

### Step 5: Duplicate Detection

Check for existing issues within 100 meters with same category, created in last 30 days.

```typescript
const { data: nearbyIssues } = await supabase.rpc('find_nearby_issues', {
  p_latitude: issue.latitude,
  p_longitude: issue.longitude,
  p_radius_meters: 100,
  p_category: aiResult.category,
  p_days_back: 30,
  p_exclude_id: issue.id
});

// SQL function:
// CREATE OR REPLACE FUNCTION find_nearby_issues(...)
// RETURNS TABLE(id uuid, title text, status issue_status) AS $$
//   SELECT id, title, status FROM issues
//   WHERE ST_DWithin(location, ST_Point(p_longitude, p_latitude)::geography, p_radius_meters)
//     AND category = p_category
//     AND created_at > now() - (p_days_back || ' days')::interval
//     AND id != p_exclude_id
//     AND deleted_at IS NULL
//     AND status != 'rejected'
//   ORDER BY created_at DESC LIMIT 1;
// $$ LANGUAGE SQL;

const isDuplicate = nearbyIssues && nearbyIssues.length > 0;
const duplicateOf = isDuplicate ? nearbyIssues[0].id : null;
```

**Duplicate handling:**
- If duplicate found AND original is `resolved`: still process (issue recurred)
- If duplicate found AND original is active: mark new issue as `rejected`, notify reporter with link to original

---

### Step 6: Department Routing

Map AI category → department slug:

```typescript
const CATEGORY_TO_DEPT: Record<string, string> = {
  pothole: 'roads',
  road_damage: 'roads',
  water_leak: 'water',
  sewage: 'water',
  streetlight: 'electricity',
  garbage: 'waste',
  illegal_dumping: 'waste',
  fallen_tree: 'parks',
  park_damage: 'parks',
  other: 'other'
};

const deptSlug = CATEGORY_TO_DEPT[aiResult.category] ?? 'other';

const { data: department } = await supabase
  .from('departments')
  .select('id')
  .eq('slug', deptSlug)
  .single();
```

---

### Step 7: Update Issue Record

```typescript
const newStatus = (() => {
  if (!aiResult.is_valid_civic_issue) return 'rejected';
  if (isDuplicate) return 'rejected';
  return 'ai_processed';
})();

await supabase.from('issues').update({
  ai_category: aiResult.category,
  ai_severity: aiResult.severity,
  ai_summary: aiResult.summary,
  ai_confidence: aiResult.confidence,
  ai_is_duplicate: isDuplicate,
  ai_duplicate_of: duplicateOf,
  ai_processed_at: new Date().toISOString(),
  status: newStatus,
  // Auto-assign department if valid
  assigned_department_id: newStatus === 'ai_processed' ? department.id : null,
  assigned_at: newStatus === 'ai_processed' ? new Date().toISOString() : null,
  // Use AI severity if confidence > 0.7, else keep user's severity
  severity: aiResult.confidence > 0.7 ? aiResult.severity : issue.severity,
  category: aiResult.confidence > 0.7 ? aiResult.category : issue.category,
}).eq('id', issue_id);
```

---

### Step 8: Audit Log

```typescript
await supabase.from('issue_updates').insert({
  issue_id: issue_id,
  updated_by: issue.reporter_id,  // system action on behalf of reporter
  type: 'ai_processed',
  new_status: newStatus,
  note: isDuplicate
    ? `AI detected duplicate of issue ${duplicateOf}`
    : `AI classified: ${aiResult.category}, severity: ${aiResult.severity}, confidence: ${(aiResult.confidence * 100).toFixed(0)}%`,
  metadata: {
    ai_category: aiResult.category,
    ai_severity: aiResult.severity,
    ai_confidence: aiResult.confidence,
    department_assigned: department?.id,
    is_duplicate: isDuplicate,
    duplicate_of: duplicateOf
  }
});
```

---

### Step 9: Notifications

```typescript
// Notify reporter of result
if (newStatus === 'rejected' && isDuplicate) {
  await sendNotification(issue.reporter_id, {
    type: 'issue_updated',
    title: 'Duplicate Issue Detected',
    body: `Your report is similar to an existing issue nearby. We've linked them together.`,
    issue_id: duplicateOf
  });
} else if (newStatus === 'ai_processed') {
  await sendNotification(issue.reporter_id, {
    type: 'issue_assigned',
    title: 'Issue Routed to Department',
    body: `Your ${aiResult.category} report has been assigned to ${department.name}.`,
    issue_id: issue_id
  });
}

// Notify department admins
const { data: deptAdmins } = await supabase
  .from('profiles')
  .select('id')
  .eq('department_id', department.id)
  .eq('role', 'department_admin');

for (const admin of deptAdmins) {
  await sendNotification(admin.id, {
    type: 'issue_assigned',
    title: 'New Issue Assigned',
    body: `New ${aiResult.severity} severity ${aiResult.category} reported in your area.`,
    issue_id: issue_id
  });
}
```

---

## Helper Edge Function: `send-notification`

Internal function called by other Edge Functions. Not publicly accessible.

```typescript
// Input
{
  user_id: string,
  type: notification_type,
  title: string,
  body: string,
  issue_id?: string
}

// Logic:
// 1. Insert into notifications table (in-app)
// 2. Fetch push tokens for user
// 3. Call Expo Push API: https://exp.host/--/api/v2/push/send
```

**Expo Push Payload:**
```json
{
  "to": "ExponentPushToken[...]",
  "title": "Issue Routed to Department",
  "body": "Your pothole report has been assigned to Roads & Infrastructure.",
  "data": { "issue_id": "uuid", "type": "issue_assigned" },
  "sound": "default"
}
```

---

## Error Handling & Retry

| Failure Scenario | Behavior |
|---|---|
| Gemini API timeout (>15s) | Retry once after 5s; if fails again, leave status `pending`, log error |
| Gemini returns invalid JSON | Strip markdown, retry parse; fallback to user's category/severity |
| Image download fails | Retry once; if fails, process with text only (no vision) |
| Duplicate detection query fails | Skip duplicate check, proceed with processing |
| Department not found | Default to 'other' department |
| Issue already processed | Early return, no-op |

**Retry Logic:**
```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, delay = 5000): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === maxRetries) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

---

## Performance Targets
| Metric | Target |
|---|---|
| Total processing time | < 10 seconds |
| Gemini API call | < 8 seconds |
| Duplicate check | < 500ms |
| DB update + notification | < 1 second |

---

## Acceptance Criteria
- [ ] Valid civic issue: status changes `pending` → `ai_processed`, department auto-assigned
- [ ] Invalid civic issue (e.g., selfie): status = `rejected`, `ai_is_valid_civic_issue = false`
- [ ] Duplicate within 100m same category: status = `rejected`, `ai_duplicate_of` set
- [ ] Recurred issue (original resolved): NOT marked duplicate
- [ ] AI confidence > 0.7: overrides user's category/severity
- [ ] AI confidence ≤ 0.7: keeps user's category/severity
- [ ] Reporter notified of outcome in all cases
- [ ] Department admins notified of new assignment
- [ ] Gemini timeout: issue remains processable, doesn't get stuck
- [ ] Audit log entry created for every AI processing event
