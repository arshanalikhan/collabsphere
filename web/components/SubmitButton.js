'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

// Submit button for server-action forms: shows progress, then a short "saved" confirmation
export default function SubmitButton({ children = 'Save', done = 'Saved ✓' }) {
  const { pending } = useFormStatus();
  const [saved, setSaved] = useState(false);
  const wasPending = useRef(false);
  useEffect(() => {
    const finished = wasPending.current && !pending;
    wasPending.current = pending;
    if (!finished) return;
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [pending]);
  return <button disabled={pending}>{pending ? 'Saving…' : saved ? done : children}</button>;
}
