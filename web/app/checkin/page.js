import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import CheckInScanner from '@/components/CheckInScanner';

export const metadata = { title: 'Check in' };

export default async function CheckInPage() {
  if (!(await getCurrentUser())) redirect('/signin?callbackUrl=/checkin');
  return (
    <section className="panel">
      <h1>Proof-of-presence check-in</h1>
      <CheckInScanner />
    </section>
  );
}
