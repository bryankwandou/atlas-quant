/**
 * Public chart page = same UX as /dashboard.
 * Simply forward to /dashboard so kita punya single source-of-truth.
 */
import { redirect } from 'next/navigation';

export default function ChartRedirect() {
  redirect('/dashboard');
}
