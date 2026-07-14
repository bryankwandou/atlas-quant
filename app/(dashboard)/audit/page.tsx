/**
 * /audit lama → dipindah ke konsol superadmin tersembunyi /dashboard
 * (gate login database server-side, bukan localStorage). Redirect permanen
 * supaya bookmark lama tetap jalan.
 */
import { redirect } from 'next/navigation';

export default function AuditRedirect() {
  redirect('/dashboard');
}
