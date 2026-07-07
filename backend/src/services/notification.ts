import { supabaseAdmin } from '../supabase';
import { config } from '../config';

export async function sendNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  issueId?: string | null
): Promise<void> {
  await supabaseAdmin.from('notifications').insert([{
    user_id: userId,
    issue_id: issueId ?? null,
    type,
    title,
    body,
  }])

  const { data: tokens } = await supabaseAdmin
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)

  if (tokens && tokens.length > 0) {
    await sendExpoPush(tokens.map(r => r.token), title, body, { issue_id: issueId, type });
  }
}

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  const messages = tokens.map(token => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
  }));

  try {
    const resp = await fetch(config.expoPushApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      console.error(`Expo push notification failed: ${resp.status}`);
    }
  } catch (err) {
    console.error('Expo push notification failed:', err);
  }
}
