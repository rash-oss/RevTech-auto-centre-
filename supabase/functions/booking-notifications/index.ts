import { createClient } from 'npm:@supabase/supabase-js@2.116.0';

const api = 'https://exp.host/--/api/v2/push/';
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const key = req.headers.get('X-Worker-Key');
  if (!key || key.length !== 64) return new Response('Unauthorized', { status: 401 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))), b => b.toString(16).padStart(2, '0')).join('');
  const auth = await db.from('push_worker_auth').select('digest').eq('digest', digest).maybeSingle();
  if (auth.error || !auth.data) return new Response('Unauthorized', { status: 401 });
  const post = async (path: string, body: unknown) => {
    const response = await fetch(api + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Expo HTTP ${response.status}`);
    return await response.json();
  };
  const update = async (id: number, value: Record<string, unknown>) => {
    const { error } = await db.from('push_deliveries').update({ ...value, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  };
  try {
    // Expired attempts are terminal; retain diagnostic codes, never credential values.
    await db.from('push_deliveries').update({ state: 'failed', last_error: 'Retry limit reached' }).eq('state', 'sending').gte('attempts', 5).lte('available_at', new Date().toISOString());
    const { data: jobs, error } = await db.rpc('claim_push_deliveries');
    if (error) throw error;
    for (const job of jobs || []) {
      try {
        const [token, pref] = await Promise.all([
          db.from('push_tokens').select('token').eq('id', job.token_id).eq('user_id', job.user_id).maybeSingle(),
          db.from('notification_preferences').select('push_enabled,booking_updates').eq('user_id', job.user_id).maybeSingle(),
        ]);
        if (token.error || pref.error) throw new Error('Preferences lookup failed');
        if (!token.data || pref.data?.push_enabled === false || pref.data?.booking_updates === false) { await update(job.id, { state: 'skipped' }); continue; }
        const result = await post('send', [{ to: token.data.token, title: 'RevTech booking update', body: 'Your booking has been updated. Open RevTech for details.', sound: 'default', channelId: 'booking-updates', ttl: 3600 }]);
        const ticket = result.data?.[0];
        if (ticket?.status === 'ok' && ticket.id) {
          await update(job.id, { state: 'ticket', ticket_id: ticket.id, available_at: new Date(Date.now() + 15 * 60000).toISOString() });
        } else {
          const code = ticket?.details?.error || 'Invalid Expo response';
          if (code === 'DeviceNotRegistered') await db.from('push_tokens').delete().eq('id', job.token_id);
          if (['DeviceNotRegistered','MessageTooBig','InvalidCredentials','MismatchSenderId'].includes(code)) await update(job.id, { state: 'failed', last_error: code });
          else throw new Error(code);
        }
      } catch {
        await update(job.id, { state: job.attempts >= 5 ? 'failed' : 'queued', last_error: 'Delivery attempt failed', available_at: new Date(Date.now() + Math.min(60, 2 ** job.attempts) * 60000).toISOString() });
      }
    }
    const { data: pending, error: receiptsError } = await db.from('push_deliveries').select('id,ticket_id,token_id,created_at').eq('state','ticket').lte('available_at',new Date().toISOString()).limit(100);
    if (receiptsError) throw receiptsError;
    if (pending?.length) {
      const receipts = await post('getReceipts', { ids: pending.map(job => job.ticket_id) });
      for (const job of pending) {
        const receipt = receipts.data?.[job.ticket_id];
        if (receipt?.status === 'ok') await update(job.id, { state: 'delivered', last_error: null });
        else if (receipt?.status === 'error') {
          const code = receipt.details?.error || 'Receipt error';
          await update(job.id, { state: 'failed', last_error: code });
          if (code === 'DeviceNotRegistered') await db.from('push_tokens').delete().eq('id',job.token_id);
        } else if (Date.now() - Date.parse(job.created_at) > 24 * 3600000) await update(job.id, { state: 'failed', last_error: 'Receipt unavailable' });
      }
    }
    // Limit retained delivery metadata.
    await db.from('push_deliveries').delete().in('state',['delivered','failed','skipped']).lt('created_at',new Date(Date.now()-30*86400000).toISOString());
    return Response.json({ processed: jobs?.length || 0 });
  } catch { return Response.json({ error: 'Worker failed; queued work will retry' }, { status: 500 }); }
});
