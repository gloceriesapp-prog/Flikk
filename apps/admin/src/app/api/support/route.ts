import { supabaseAdmin } from '@/lib/supabase/admin';
import { supportAdmin, supportPage, supportFailure } from '@/features/customer-support/server';
export async function GET(request: Request) {
    try {
        await supportAdmin();
        const url = new URL(request.url);
        const offset = supportPage(url.searchParams.get('offset'));
        const status = url.searchParams.get('status');
        if (status && !['open', 'in_progress', 'resolved'].includes(status))
            throw new Error('INVALID_STATUS');
        // Requester role (migration 118): customer, rider or store_owner.
        const role = url.searchParams.get('role');
        if (role && !['customer', 'rider', 'store_owner'].includes(role))
            throw new Error('INVALID_ROLE');
        let query = supabaseAdmin.from('support_tickets').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 24);
        if (status)
            query = query.eq('status', status);
        if (role)
            query = query.eq('requester_role', role);
        const { data, error } = await query;
        if (error)
            throw error;
        return Response.json(data ?? []);
    }
    catch (error) {
        return supportFailure(error);
    }
}
