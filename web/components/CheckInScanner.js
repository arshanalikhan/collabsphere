'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import FaceCheck from './FaceCheck';

const getPosition = () => new Promise((resolve, reject) =>
  navigator.geolocation.getCurrentPosition(
    (p) => resolve({ lng: p.coords.longitude, lat: p.coords.latitude }), reject, { enableHighAccuracy: true }));

async function submit(body) {
  const res = await fetch('/api/checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export default function CheckInScanner() {
  const [msg, setMsg] = useState('Scan the QR shown by the host.');
  const [pending, setPending] = useState(null); // scan waiting on a face check
  const scanner = useRef(null);

  const finish = useCallback(async (body) => {
    const r = await submit(body);
    if (r.ok) {
      setMsg(`✅ Checked in! +${r.data.pointsEarned} points for your house.`);
    } else if (r.status === 428) {
      setPending(body);
      setMsg('This event needs a quick face check.');
    } else {
      setMsg(`❌ ${r.data.error}`);
      scanner.current?.resume();
    }
  }, []);

  useEffect(() => {
    let s;
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      s = scanner.current = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 240 }, false);
      s.render(async (token) => {
        s.pause(true);
        try {
          setMsg('Checking your location…');
          await finish({ token, ...(await getPosition()) });
        } catch (e) {
          setMsg(`❌ ${e.message}`);
          s.resume();
        }
      }, () => {});
    });
    return () => { s?.clear().catch(() => {}); };
  }, [finish]);

  const onFaceDone = useCallback(({ selfie, live }) => {
    const body = pending;
    setPending(null);
    setMsg('Submitting…');
    finish({ ...body, selfie, faceVerified: live });
  }, [pending, finish]);

  return (
    <>
      <div id="reader" hidden={!!pending} />
      {pending && (
        <FaceCheck onDone={onFaceDone} onCancel={() => { setPending(null); setMsg('Face check cancelled.'); scanner.current?.resume(); }} />
      )}
      <p role="status" aria-live="polite">{msg}</p>
    </>
  );
}
