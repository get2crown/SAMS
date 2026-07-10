import React, { useEffect, useRef, useState } from 'react';
import { FiAlertCircle, FiCheckCircle, FiEye, FiLoader, FiMapPin } from 'react-icons/fi';
import { FaceRecognitionService, LivenessTracker } from '../services/faceService';
import { GeolocationService } from '../services/geolocation';
import { AttendanceService } from '../services/attendanceService';
import { LocationData } from '../types';
import toast from 'react-hot-toast';

// Target for the client-side GPS acquisition loop — good enough to stop
// waiting early. The real accept/reject decision happens server-side,
// scaled to the company's actual geofence radius (which the client
// doesn't know), so this is just an effort budget, not a hard gate.
const GOOD_ENOUGH_ACCURACY_M = 50;
const GPS_ACQUIRE_TIMEOUT_MS = 8000;
// Tracking frames are cheap (landmarks only, no descriptor) so we can sample
// densely — matters for actually catching a blink's brief closed window.
const DETECT_INTERVAL_MS = 100;
// If blink detection hasn't triggered after this long (bad lighting, glasses,
// an unusual camera), offer a manual fallback instead of leaving the user stuck.
const MANUAL_FALLBACK_MS = 7000;
// Enrollment is the reference every future check-in gets compared against,
// so it's worth averaging a few samples (each a full, expensive descriptor
// pass) to smooth out noise from a single frame's lighting/angle/blur.
const ENROLL_SAMPLE_COUNT = 3;
const ENROLL_SAMPLE_GAP_MS = 200;

type Mode = 'enroll' | 'checkin' | 'checkout';
type Step = 'blink' | 'capturing' | 'confirming-location' | 'done';

interface CameraCheckInProps {
  mode: Mode;
  onDone: () => void;
}

const faceService = FaceRecognitionService.getInstance();

const CameraCheckIn: React.FC<CameraCheckInProps> = ({ mode, onDone }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const livenessRef = useRef<LivenessTracker | null>(null);
  const manualCaptureRef = useRef<(() => void) | null>(null);
  // Check-in kicks off geolocation in parallel with the camera/liveness dance
  // instead of blocking on it first — by the time a face is verified, this
  // has usually already resolved on its own.
  const locationPromiseRef = useRef<Promise<LocationData> | null>(null);
  const [step, setStep] = useState<Step>('blink');
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [showManualFallback, setShowManualFallback] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detectionTimer: number | null = null;
    let fallbackTimer: number | null = null;
    let cancelled = false;

    if (mode === 'checkin') {
      locationPromiseRef.current = GeolocationService.getBestPosition(
        GOOD_ENOUGH_ACCURACY_M,
        GPS_ACQUIRE_TIMEOUT_MS,
        (accuracy) => {
          if (!cancelled) setLiveAccuracy(accuracy);
        }
      );
      // Prevent an unhandled-rejection warning; the real error is surfaced
      // wherever we actually await this promise, in captureAndVerify().
      locationPromiseRef.current.catch(() => {});
    }

    const start = async () => {
      try {
        await faceService.loadModels();
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (cancelled) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        livenessRef.current = faceService.createLivenessTracker();
        setStep('blink');
        setStatusMessage('Look at the camera and blink to verify you’re here in person');
        detectionTimer = window.setInterval(detectLoop, DETECT_INTERVAL_MS);
        fallbackTimer = window.setTimeout(() => {
          if (!cancelled) setShowManualFallback(true);
        }, MANUAL_FALLBACK_MS);
      } catch (err: any) {
        setFatalError('Camera access failed: ' + (err.message || 'unknown error'));
      }
    };

    const detectLoop = async () => {
      if (!videoRef.current || !livenessRef.current) return;
      // Cheap pass: landmarks only, no descriptor — this is what lets us
      // sample often enough to actually catch a blink.
      const detection = await faceService.detectLandmarks(videoRef.current);
      // Don't discard a missed frame — a brief detection dropout right
      // after a stable lock is itself a liveness signal (see faceService).
      const blinked = livenessRef.current.update(detection ? detection.landmarks : null);
      if (blinked) {
        if (detectionTimer) window.clearInterval(detectionTimer);
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        await captureAndVerify();
      }
    };

    /**
     * Gets an averaged descriptor from several full (expensive) detection
     * passes. Used for enrollment, where the result becomes the permanent
     * reference every future check-in is compared against.
     */
    const captureAveragedDescriptor = async (samples: number): Promise<Float32Array> => {
      const descriptors: Float32Array[] = [];
      for (let i = 0; i < samples; i++) {
        if (videoRef.current) {
          const detection = await faceService.detectDescriptor(videoRef.current);
          if (detection) descriptors.push(detection.descriptor);
        }
        if (i < samples - 1) {
          await new Promise((r) => setTimeout(r, ENROLL_SAMPLE_GAP_MS));
        }
      }
      if (!descriptors.length) {
        throw new Error('No face detected. Please try again.');
      }
      const length = descriptors[0].length;
      const avg = new Float32Array(length);
      for (const d of descriptors) {
        for (let i = 0; i < length; i++) avg[i] += d[i] / descriptors.length;
      }
      return avg;
    };

    const restartLivenessLoop = () => {
      setStep('blink');
      setShowManualFallback(false);
      livenessRef.current?.reset();
      detectionTimer = window.setInterval(detectLoop, DETECT_INTERVAL_MS);
      fallbackTimer = window.setTimeout(() => {
        if (!cancelled) setShowManualFallback(true);
      }, MANUAL_FALLBACK_MS);
    };

    const captureAndVerify = async () => {
      setStep('capturing');
      try {
        let descriptor: Float32Array;
        if (mode === 'enroll') {
          descriptor = await captureAveragedDescriptor(ENROLL_SAMPLE_COUNT);
        } else {
          if (!videoRef.current) throw new Error('Camera not ready');
          const detection = await faceService.detectDescriptor(videoRef.current);
          if (!detection) throw new Error('No face detected. Please try again.');
          descriptor = detection.descriptor;
        }

        if (mode === 'enroll') {
          await AttendanceService.enrollFace(descriptor);
          toast.success('Face enrolled successfully');
        } else if (mode === 'checkin') {
          // Face is verified — now consult location, which has most likely
          // already resolved in the background during the blink dance.
          setStep('confirming-location');
          const loc = await locationPromiseRef.current!;
          await AttendanceService.checkIn(loc, descriptor);
          toast.success('Checked in successfully');
        }
        setStep('done');
        onDone();
      } catch (err: any) {
        toast.error(err.response?.data?.error || err.message || 'Verification failed');
        if (cancelled) return;
        restartLivenessLoop();
      }
    };

    manualCaptureRef.current = () => {
      if (detectionTimer) window.clearInterval(detectionTimer);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      captureAndVerify();
    };

    if (mode === 'checkout') {
      setStep('capturing');
      AttendanceService.checkOut()
        .then(() => {
          toast.success('Checked out successfully');
          setStep('done');
          onDone();
        })
        .catch((err) => {
          toast.error(err.response?.data?.error || 'Check-out failed');
          setStep('done');
        });
    } else {
      start();
    }

    return () => {
      cancelled = true;
      if (detectionTimer) window.clearInterval(detectionTimer);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, retryKey]);

  const retry = () => {
    setFatalError(null);
    setLiveAccuracy(null);
    setStep('blink');
    setRetryKey((k) => k + 1);
  };

  if (mode === 'checkout') {
    return (
      <div className="card flex flex-col items-center gap-3 py-10 text-center">
        {step === 'done' ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
              <FiCheckCircle size={22} />
            </div>
            <p className="font-medium text-gray-900">Checked out</p>
          </>
        ) : (
          <>
            <FiLoader className="animate-spin text-brand-600" size={28} />
            <p className="text-sm text-gray-500">Checking out…</p>
          </>
        )}
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="card">
        <div className="flex items-start gap-3">
          <FiAlertCircle className="mt-0.5 shrink-0 text-red-600" size={20} />
          <p className="text-sm text-red-700">{fatalError}</p>
        </div>
        <button onClick={retry} className="btn-secondary mt-4 w-full">
          Retry
        </button>
      </div>
    );
  }

  const steps: { key: Step; label: string }[] =
    mode === 'checkin'
      ? [
          { key: 'blink', label: 'Liveness' },
          { key: 'capturing', label: 'Verify' },
          { key: 'confirming-location', label: 'Location' },
          { key: 'done', label: 'Done' },
        ]
      : [
          { key: 'blink', label: 'Liveness' },
          { key: 'capturing', label: 'Verify' },
          { key: 'done', label: 'Done' },
        ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="card text-center">
      <div className="mb-5 flex items-center justify-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                i < stepIndex
                  ? 'bg-brand-600 text-white'
                  : i === stepIndex
                  ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500/30'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < stepIndex ? <FiCheckCircle size={13} /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-6 ${i < stepIndex ? 'bg-brand-600' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-xl border-2 border-brand-500 bg-gray-900">
        <video ref={videoRef} autoPlay muted playsInline className="w-full -scale-x-100" />
        {(step === 'capturing' || step === 'confirming-location') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-900/60 text-white">
            {step === 'confirming-location' ? <FiMapPin size={24} /> : <FiLoader className="animate-spin" size={24} />}
            <p className="text-sm">{step === 'confirming-location' ? 'Confirming your location…' : 'Verifying…'}</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600">
        {step === 'blink' && <FiEye className="text-brand-600" size={16} />}
        <p>
          {step === 'blink' && statusMessage}
          {step === 'capturing' && 'Verifying…'}
          {step === 'confirming-location' &&
            (liveAccuracy !== null
              ? `Confirming your location… (accuracy ${Math.round(liveAccuracy)}m)`
              : 'Confirming your location…')}
          {step === 'done' && (mode === 'enroll' ? 'Face enrolled.' : 'Checked in.')}
        </p>
      </div>

      {step === 'blink' && showManualFallback && (
        <button onClick={() => manualCaptureRef.current?.()} className="btn-secondary mt-3 w-full">
          Not detecting a blink — tap to continue
        </button>
      )}
    </div>
  );
};

export default CameraCheckIn;
