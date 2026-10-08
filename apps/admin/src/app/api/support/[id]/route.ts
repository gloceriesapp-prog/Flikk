import { supabaseAdmin } from '@/lib/supabase/admin';
import { supportAdmin, supportPage, supportId, supportFailure } from '@/features/customer-support/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
type Context = {
    params: Promise<{
        id: string;
    }>;
};
export async function GET(request: Request, context: Context) {
    const { denied } = await requireAdmin();
    if (denied) return denied;
    try {
        await supportAdmin();
        const id = supportId((await context.params).id);
        const offset = supportPage(new URL(request.url).searchParams.get('offset'));
        const { data: ticket, error } = await supabaseAdmin.from('support_tickets').select('*').eq('id', id).maybeSingle();
        if (error)
            throw error;
        if (!ticket)
            return Response.json({ error: 'Ticket not found.' }, { status: 404 });
        const { data: messages, error: threadError } = await supabaseAdmin.from('support_messages').select('id,actor_role,body,status_after,created_at').eq('ticket_id', id).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 24);
        if (threadError)
            throw threadError;
        return Response.json({ ticket, messages: messages ?? [] });
    }
    catch (error) {
        return supportFailure(error);
    }
}
export async function POST(request: Request, context: Context) {
    const { denied } = await requireAdmin();
    if (denied) return denied;
    try {
        const user = await supportAdmin();
        const id = supportId((await context.params).id);
        const body = await request.json();
        if (typeof body.message !== 'string' || !body.message.trim() || body.message.trim().length > 2000 || !['open', 'in_progress', 'resolved'].includes(body.status))
            throw new Error('INVALID_MESSAGE');
        const { data, error } = await supabaseAdmin.rpc('reply_support_ticket', { p_ticket_id: id, p_actor_id: user.id, p_request_id: supportId(body.request_id), p_body: body.message.trim(), p_status: body.status });
        if (error)
            throw error;
        return Response.json({ id: data }, { status: 201 });
    }
    catch (error) {
        return supportFailure(error);
    }
}
