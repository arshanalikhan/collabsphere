import { notFound } from 'next/navigation';
import { devAuthEnabled } from '@/lib/auth';
import FaceCheckDemo from '@/components/FaceCheckDemo';

export const metadata = { title: 'Face check demo' };

// Demo-mode only: try the liveness check without scanning a QR (handy for the jury walkthrough)
export default function FaceCheckDemoPage() {
  if (!devAuthEnabled()) notFound();
  return <section className="panel"><FaceCheckDemo /></section>;
}
