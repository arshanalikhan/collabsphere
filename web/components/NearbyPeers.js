'use client';

import { useEffect, useState } from 'react';

export default function NearbyPeers({ km = 150 }) {
  const [peers, setPeers] = useState(null);
  useEffect(() => {
    fetch(`/api/users/nearby?km=${km}`).then((r) => (r.ok ? r.json() : [])).then(setPeers);
  }, [km]);

  if (!peers) return <p className="muted">Loading…</p>;
  if (!peers.length) return <p className="muted">No peers within {km} km yet. Set your city on your profile.</p>;
  return peers.map((p) => (
    <div key={p._id} className="card"><b>{p.name}</b><span>{p.house} · {p.city}</span></div>
  ));
}
