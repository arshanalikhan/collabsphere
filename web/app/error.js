'use client';

import Link from 'next/link';

// Friendly fallback for unexpected server or client errors (instead of Next's bare "Application error")
export default function Error({ reset }) {
  return (
    <section className="panel accent-top" style={{ '--accent-color': 'var(--coral)' }}>
      <span className="hand">well, that wasn’t supposed to happen</span>
      <h1>Something went wrong</h1>
      <p>Please try again. If it keeps happening, let an organiser know.</p>
      <div className="row">
        <button onClick={() => reset()}>Try again</button>
        <Link href="/" className="btn ghost">Back to the map</Link>
      </div>
    </section>
  );
}
