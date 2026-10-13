'use client';

import { useEffect, useRef, useState } from 'react';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
const TURN = 0.22;   // yaw needed to count as a head turn
const CENTER = 0.08; // yaw considered "facing the camera"

// Rough head yaw from BlazeFace keypoints: nose offset from the eye midpoint, normalised by eye distance
const yawOf = ({ keypoints: k }) => {
  const [rEye, lEye, nose] = k;
  const eyeDist = Math.hypot(lEye.x - rEye.x, lEye.y - rEye.y) || 1;
  return (nose.x - (rEye.x + lEye.x) / 2) / eyeDist;
};

/**
 * Runs entirely in the browser: one face must be visible, the person turns their head
 * and returns to centre (a printed photo can't), then a small selfie is captured for the host's audit log.
 */
export default function FaceCheck({ onDone, onCancel }) {
  const video = useRef(null);
  const [step, setStep] = useState('loading'); // loading | center | turn | back | done | error
  const [hint, setHint] = useState('Starting camera…');

  useEffect(() => {
    let stream, detector, raf, cancelled = false;
    let phase = 'center', centeredSelfie = null;

    const snap = () => {
      const v = video.current, c = document.createElement('canvas');
      const s = 160 / Math.max(v.videoWidth, v.videoHeight);
      c.width = v.videoWidth * s; c.height = v.videoHeight * s;
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.7);
    };

    const loop = () => {
      if (cancelled) return;
      const v = video.current;
      if (v.readyState >= 2) {
        const faces = detector.detectForVideo(v, performance.now()).detections;
        if (faces.length !== 1) {
          setHint(faces.length ? 'Only one person in frame, please.' : 'Look at the camera.');
        } else {
          const yaw = Math.abs(yawOf(faces[0]));
          if (phase === 'center' && yaw < CENTER) {
            centeredSelfie = snap();
            phase = 'turn'; setStep('turn'); setHint('Now slowly turn your head to one side.');
          } else if (phase === 'turn' && yaw > TURN) {
            phase = 'back'; setStep('back'); setHint('Great, now face the camera again.');
          } else if (phase === 'back' && yaw < CENTER) {
            setStep('done'); setHint('Verified ✓');
            onDone({ selfie: centeredSelfie || snap(), live: true });
            return;
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };

    (async () => {
      try {
        const { FilesetResolver, FaceDetector } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks(WASM);
        detector = await FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.6,
        });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 } });
        if (cancelled) return;
        video.current.srcObject = stream;
        await video.current.play();
        setStep('center'); setHint('Look straight at the camera.');
        loop();
      } catch (e) {
        setStep('error'); setHint(`Camera unavailable: ${e.message}`);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      detector?.close();
    };
  }, [onDone]);

  const progress = { loading: 0, center: 1, turn: 2, back: 3, done: 4, error: 0 }[step];
  return (
    <div className="facecheck">
      <h2>Quick face check</h2>
      <p className="muted">This event asks for a liveness check. It runs on your device; only a small thumbnail is shared with the hosts and deleted after 30 days.</p>
      <div className={`face-frame ${step}`}>
        <video ref={video} muted playsInline aria-label="Front camera preview" />
      </div>
      <ol className="steps" aria-label="Progress">
        {['Face the camera', 'Turn your head', 'Face the camera again'].map((s, i) => (
          <li key={s} className={progress > i + 1 ? 'ok' : progress === i + 1 ? 'now' : ''}>{s}</li>
        ))}
      </ol>
      <p role="status" aria-live="polite"><b>{hint}</b></p>
      <button className="ghost" onClick={onCancel}>Cancel</button>
    </div>
  );
}
