'use client';

import { useCallback, useState } from 'react';
import FaceCheck from './FaceCheck';

export default function FaceCheckDemo() {
  const [result, setResult] = useState(null);
  const [run, setRun] = useState(0);
  const onDone = useCallback((r) => setResult(r), []);

  if (result) {
    return (
      <div className="facecheck">
        <h2>Liveness passed ✓</h2>
        <img src={result.selfie} alt="Captured thumbnail" className="selfie big" />
        <p className="muted">This thumbnail is what host admins would see in the check-in log.</p>
        <button onClick={() => { setResult(null); setRun(run + 1); }}>Try again</button>
      </div>
    );
  }
  return <FaceCheck key={run} onDone={onDone} onCancel={() => setRun(run + 1)} />;
}
