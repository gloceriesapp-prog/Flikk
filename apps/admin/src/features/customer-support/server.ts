import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';
export async function supportAdmin() {
    const user = await requireAdminSession();
    if (!user)
        throw new Error('UNAUTHENTICATED');
    const { data, error } = await supabaseAdmin.from('users').select('role').eq('id', user.id).maybeSingle();
    if (error)
        throw error;
    if (data?.role !== 'admin')
        throw new Error('FORBIDDEN');
    return user;
}
export function supportPage(value: string | null) {
    const offset = Number(value ?? 0);
    if (!Number.isInteger(offset) || offset < 0 || offset > 5000)
        throw new Error('INVALID_PAGE');
    return offset;
}
export function supportId(value: unknown): string {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
        throw new Error('INVALID_ID');
    return value;
}
export function supportFailure(error: unknown) {
    const text = error instanceof Error ? error.message : '';
    const code = (error as {
        code?: string;
    })?.code;
    const status = text === 'UNAUTHENTICATED' ? 401 : text === 'FORBIDDEN' ? 403 : text.startsWith('INVALID_') ? 400 : code === 'P0404' ? 404 : code === 'P0409' || code === '23505' ? 409 : code === 'P0429' ? 429 : 503;
    return Response.json({ error: status === 409 ? 'Request changed or another active case exists. Refresh before replying.' : status === 503 ? 'Support is temporarily unavailable. Retry safely.' : status === 401 ? 'Sign in to continue.' : status === 403 ? 'Admin access required.' : 'Could not complete this request.' }, { status });
}
