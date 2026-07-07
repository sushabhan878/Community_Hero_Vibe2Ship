import { config } from '../config';
import { supabaseAdmin } from '../supabase';

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
  other: 'other',
};

interface AiResult {
  category: string;
  severity: string;
  confidence: number;
  summary: string;
  is_valid_civic_issue: boolean;
  rejection_reason?: string;
  estimated_resolution_days?: number;
}

export async function processIssueWithAi(issueId: string): Promise<void> {
  try {
    const { data: issue } = await supabaseAdmin
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .single()

    if (!issue || issue.status !== 'pending') return;

    const aiResult = await callGemini(issue);
    if (!aiResult) return;

    const isValid = aiResult.is_valid_civic_issue !== false;
    const newStatus = isValid ? 'ai_processed' : 'rejected';

    const deptSlug = CATEGORY_TO_DEPT[aiResult.category] || 'other';
    const { data: department } = await supabaseAdmin
      .from('departments')
      .select('id, name')
      .eq('slug', deptSlug)
      .maybeSingle()

    if ((aiResult.confidence ?? 0.5) > 0.7) {
      await supabaseAdmin
        .from('issues')
        .update({ category: aiResult.category || issue.category, severity: aiResult.severity || issue.severity })
        .eq('id', issueId)
    }

    const assignedDepartmentId = newStatus === 'ai_processed' && department ? department.id : null

    await supabaseAdmin
      .from('issues')
      .update({
        ai_category: aiResult.category,
        ai_severity: aiResult.severity,
        ai_summary: aiResult.summary,
        ai_confidence: aiResult.confidence ?? 0.5,
        ai_is_duplicate: false,
        ai_processed_at: new Date().toISOString(),
        status: newStatus,
        assigned_department_id: assignedDepartmentId,
        assigned_at: assignedDepartmentId ? new Date().toISOString() : undefined,
      })
      .eq('id', issueId)

    await supabaseAdmin
      .from('issue_updates')
      .insert([{
        issue_id: issueId,
        updated_by: issue.reporter_id,
        type: 'ai_processed',
        new_status: newStatus,
        note: `AI classified: ${aiResult.category}, severity: ${aiResult.severity}, confidence: ${Math.round((aiResult.confidence ?? 0) * 100)}%`,
        extra_meta: JSON.stringify({
          ai_category: aiResult.category,
          ai_severity: aiResult.severity,
          ai_confidence: aiResult.confidence,
          department_assigned: department?.id || null,
        }),
      }])

    if (newStatus === 'ai_processed' && department) {
      await supabaseAdmin
        .from('notifications')
        .insert([{
          user_id: issue.reporter_id,
          issue_id: issueId,
          type: 'issue_assigned',
          title: 'Issue Routed to Department',
          body: `Your ${aiResult.category} report has been assigned to ${department.name}.`,
        }])
    }
  } catch (err) {
    console.error(`AI processing failed for issue ${issueId}:`, err);
  }
}

async function callGemini(issue: any): Promise<AiResult | null> {
  if (!config.geminiApiKey) {
    console.warn('GEMINI_API_KEY not set; skipping AI processing');
    return {
      category: issue.category,
      severity: issue.severity,
      confidence: 0.5,
      summary: issue.title?.slice(0, 100) || '',
      is_valid_civic_issue: true,
    };
  }

  const prompt = `Analyze this civic issue report and respond with JSON only.

User's title: "${issue.title}"
User's description: "${issue.description || ''}"
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
}`;

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 512 },
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!resp.ok) {
      console.error(`Gemini API error: ${resp.status}`);
      return null;
    }

    const data: any = await resp.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Gemini API call failed:', err);
    return null;
  }
}
