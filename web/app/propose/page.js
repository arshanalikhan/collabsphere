import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { HOUSES } from '@/lib/houses';
import ProposeForm from '@/components/ProposeForm';

export default async function ProposePage() {
  const me = await getCurrentUser();
  if (!me || me.role === 'member') redirect('/');
  return <ProposeForm houses={HOUSES.filter((h) => h !== me.house)} />;
}
