import Link from 'next/link';

export const metadata = { title: 'Not found' };

export default function NotFound() {
  return (
    <section className="panel">
      <h1>Not found</h1>
      <p>This page doesn’t exist. <Link href="/">Back to the map</Link></p>
    </section>
  );
}
