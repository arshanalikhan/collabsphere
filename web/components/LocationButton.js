'use client';

import { useState } from 'react';

// Fills the enclosing form's lat/lng inputs from the browser's geolocation
export default function LocationButton({ digits = 5, label = 'Use my current location' }) {
  const [msg, setMsg] = useState('');
  const locate = (e) => {
    const form = e.currentTarget.form;
    if (!navigator.geolocation) return setMsg('Location is not available in this browser.');
    setMsg('Finding you…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        form.lat.value = p.coords.latitude.toFixed(digits);
        form.lng.value = p.coords.longitude.toFixed(digits);
        setMsg('');
      },
      () => setMsg('Could not get your location. Allow location access or type the coordinates.'),
    );
  };
  return (
    <div className="locate">
      <button type="button" className="ghost" onClick={locate}>📍 {label}</button>
      {msg && <span className="muted" role="status">{msg}</span>}
    </div>
  );
}
