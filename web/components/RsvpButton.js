'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RsvpButton({ id, going: initial }) {
  const [going, setGoing] = useState(initial);
  const router = useRouter();
  const rsvp = async () => {
    const res = await fetch(`/api/events/${id}/rsvp`, { method: 'POST' });
    if (res.ok) { setGoing(true); router.refresh(); }
  };
  return <button disabled={going} onClick={rsvp}>{going ? 'You’re going ✓' : 'RSVP'}</button>;
}
