// Reads and writes for staff (rider / store partner) account-deletion
// requests. See lib/staffAccountDeletion.ts for why a request is a marked
// support ticket rather than its own table.
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { DELETION_MARKER, isDeletionTicket } from '../lib/staffAccountDeletion.js';
import { supportError } from './contracts.js';

export type StaffRole = 'rider' | 'store_owner';

export interface DeletionTicket { id: string; status: string; created_at: string; updated_at: string }

export async function latestDeletionTicket(userId: string, role: StaffRole): Promise<DeletionTicket | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, status, created_at, updated_at, initial_message')
    .eq('customer_id', userId)
    .eq('requester_role', role)
    .eq('category', 'account')
    .like('initial_message', `${DELETION_MARKER}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || !isDeletionTicket(data.initial_message)) return null;
  return { id: data.id as string, status: data.status as string, created_at: data.created_at as string, updated_at: data.updated_at as string };
}

export async function createDeletionTicket(userId: string, requestId: string, message: string): Promise<string> {
  const { data: ticketId, error } = await supabase.rpc('create_staff_support_ticket', {
    p_user_id: userId, p_request_id: requestId, p_order_id: null, p_category: 'account', p_message: message,
  });
  // support_active_issue allows one open ticket per category: an unrelated
  // open "My account" ticket blocks a second one. Say so plainly.
  if (error?.code === '23505') {
    throw new AppError(409, 'ACCOUNT_TICKET_OPEN', 'You already have an open "My account" support request. Ask for deletion there, or wait until it is resolved.');
  }
  if (error) throw supportError(error);
  return ticketId as string;
}
