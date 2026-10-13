'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Host screen: refreshes the signed token every 10s; tokens expire after 30–60s
export default function HostQr({ id }) {
  const [token, setToken] = useState(null);
  useEffect(() => {
    const load = () => fetch(`/api/events/${id}/qr`).then((r) => r.json()).then((d) => setToken(d.token));
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [id]);

  return (
    <div className="qr">
      <h2>Check-in QR</h2>
      <p className="muted">Rotates every 30 seconds. Screenshots stop working.</p>
      {token ? <QRCodeSVG value={token} size={240} /> : <p>Loading…</p>}
    </div>
  );
}
