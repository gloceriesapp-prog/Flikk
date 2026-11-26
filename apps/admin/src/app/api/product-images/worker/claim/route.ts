// Worker: take the next queued photo (claim_product_image_job). 204 = empty.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireWorker } from '@/lib/productImageJobs';

export async function POST(request: Request) {
  const denied = requireWorker(request);
  if (denied) return denied;
  const { data, error } = await supabaseAdmin.rpc('claim_product_image_job');
  if (error) return NextResponse.json({ error: 'Could not claim a job.' }, { status: 500 });
  const job = (data ?? [])[0] as { id: string; original_url: string; model: string } | undefined;
  if (!job) return new NextResponse(null, { status: 204 });
  return NextResponse.json({ id: job.id, originalUrl: job.original_url, model: job.model });
}
