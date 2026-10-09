import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';
export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const { addressLabel, title, body } = await request.json();
    if (typeof addressLabel !== 'string' || !addressLabel.trim() || addressLabel.length > 500 || typeof title !== 'string' || !title.trim() || title.length > 100 || typeof body !== 'string' || !body.trim() || body.length > 500)
      return Response.json({ error: 'Enter a valid area, title and message.' }, { status: 400 });
    const { data, error } = await supabaseAdmin.rpc('notify_area_waitlist', { p_address: addressLabel, p_title: title.trim(), p_body: body.trim(), p_limit: 100 });
    if (error) throw error;
    return Response.json({ queued: data, more: data === 100 });
  } catch { return Response.json({ error: 'Could not queue notifications. Retry safely.' }, { status: 503 }); }
}
