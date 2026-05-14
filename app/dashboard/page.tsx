import { redirect } from 'next/navigation';

// Old dashboard — redirect to new dashboard
export default function OldDashboard() {
  redirect('/');
}
