'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProposeForm({ houses }) {
  const router = useRouter();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd);
    body.hostHouses = fd.getAll('hostHouses');
    body.points = Number(body.points);
    setBusy(true);
    const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) return setErr((await res.json()).error);
    router.push('/');
    router.refresh();
  };

  const useMyLocation = (e) => {
    const form = e.currentTarget.form;
    navigator.geolocation.getCurrentPosition((p) => {
      form.lat.value = p.coords.latitude.toFixed(5);
      form.lng.value = p.coords.longitude.toFixed(5);
    });
  };

  return (
    <form className="panel form" onSubmit={submit}>
      <h1>Propose an event</h1>
      <label>Title<input name="title" required /></label>
      <label>Description<textarea name="description" /></label>
      <label>Type
        <select name="kind">
          <option value="meetup">Meetup</option>
          <option value="coworking">Co-working</option>
          <option value="joint-event">Joint event</option>
        </select>
      </label>
      <div className="row">
        <label>City<input name="city" required /></label>
        <label>Venue<input name="venue" /></label>
      </div>
      <label>Starts at<input type="datetime-local" name="startsAt" required /></label>
      <div className="row">
        <label>Latitude<input name="lat" inputMode="decimal" required /></label>
        <label>Longitude<input name="lng" inputMode="decimal" required /></label>
      </div>
      <button type="button" className="ghost" onClick={useMyLocation}>Use my current location</button>
      <fieldset>
        <legend>Co-host houses (each must approve)</legend>
        <div className="chips">
          {houses.map((h) => <label key={h} className="chip"><input type="checkbox" name="hostHouses" value={h} /> {h}</label>)}
        </div>
      </fieldset>
      <label>Points for attending<input type="number" name="points" defaultValue={10} min={0} max={100} /></label>
      <label className="chip">
        <input type="checkbox" name="requireFace" /> Require a face check at check-in (liveness selfie)
      </label>
      {err && <p className="error" role="alert">{err}</p>}
      <button disabled={busy}>{busy ? 'Submitting…' : 'Submit for approval'}</button>
    </form>
  );
}
