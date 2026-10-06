import Link from 'next/link';
import { SupportInbox } from '@/features/customer-support/SupportInbox';
export default function SupportPage(){return <><Link href="/customer-deletions" className="m-6 inline-block rounded-xl border px-4 py-2">Account deletion requests</Link><SupportInbox /></>;}
