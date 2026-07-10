import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';

// Smaller input = faster forward pass through the detector. 320 is plenty
// for a face filling most of a webcam frame and meaningfully faster than
// the 416 default — matters a lot when this runs every ~100ms.
const TRACKING_OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
const CAPTURE_OPTIONS = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });

// Baseline "eyes open" EAR varies a lot by face shape, camera angle, and
// eyelid coverage — a fixed absolute threshold works for some people and
// never triggers for others. Instead we calibrate against each session's
// own baseline, sampled while the tracker assumes eyes start open.
const CALIBRATION_FRAMES = 8;
const CLOSED_RATIO = 0.85; // dip to 85% of baseline counts as "closed"
const OPEN_RATIO = 0.88; // recovering to 88% of baseline counts as "open" again

export interface LivenessTracker {
  reset(): void;
  // landmarks is null on a frame where no face was detected at all — a
  // brief dropout right after a stable lock is itself treated as a
  // liveness signal (see below), not just skipped.
  update(landmarks: faceapi.FaceLandmarks68 | null): boolean; // returns true once a blink has been observed
}

export class FaceRecognitionService {
  private static instance: FaceRecognitionService;
  private modelsLoaded = false;

  static getInstance() {
    if (!this.instance) {
      this.instance = new FaceRecognitionService();
    }
    return this.instance;
  }

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    this.modelsLoaded = true;
  }

  /**
   * Cheap per-frame check: detector + 68-point landmarks only, no descriptor.
   * Use this in tracking loops (liveness/blink) where we run every ~100ms —
   * skipping the recognition net's forward pass here is what keeps the loop
   * fast enough to actually catch a blink's brief eye-closed window.
   */
  async detectLandmarks(input: HTMLVideoElement) {
    if (!this.modelsLoaded) {
      throw new Error('Face models not loaded');
    }

    return faceapi.detectSingleFace(input, TRACKING_OPTIONS).withFaceLandmarks();
  }

  /**
   * Expensive one-shot capture: runs the full pipeline including the
   * recognition net to produce a 128-d descriptor. Call this once, at the
   * moment you actually need a descriptor (liveness confirmed, or
   * enrollment sample) — never in a per-frame loop.
   */
  async detectDescriptor(input: HTMLVideoElement) {
    if (!this.modelsLoaded) {
      throw new Error('Face models not loaded');
    }

    return faceapi.detectSingleFace(input, CAPTURE_OPTIONS).withFaceLandmarks().withFaceDescriptor();
  }

  /**
   * Eye Aspect Ratio: (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||).
   * Dips sharply during a blink and recovers on eye-open — cheap client-side liveness signal.
   */
  private eyeAspectRatio(eye: faceapi.Point[]): number {
    const dist = (a: faceapi.Point, b: faceapi.Point) => Math.hypot(a.x - b.x, a.y - b.y);
    const vertical1 = dist(eye[1], eye[5]);
    const vertical2 = dist(eye[2], eye[4]);
    const horizontal = dist(eye[0], eye[3]);
    return (vertical1 + vertical2) / (2 * horizontal);
  }

  averageEAR(landmarks: faceapi.FaceLandmarks68): number {
    const left = this.eyeAspectRatio(landmarks.getLeftEye());
    const right = this.eyeAspectRatio(landmarks.getRightEye());
    return (left + right) / 2;
  }

  /**
   * Tracks EAR over successive frames and reports a blink once the eyes
   * have dipped and recovered relative to this session's own calibrated
   * baseline (see CALIBRATION_FRAMES above).
   */
  createLivenessTracker(): LivenessTracker {
    let baselineSamples: number[] = [];
    let baseline: number | null = null;
    let sawClosed = false;
    let blinked = false;
    // How many consecutive frames we've had a confident detection — used to
    // tell "the face was locked on, then briefly vanished" (very likely a
    // blink: closed eyes reduce the tiny-face-detector's own confidence,
    // often below its detection threshold for a frame or two) apart from
    // "no face has been found yet" (not a blink, just not lined up).
    let stableFrames = 0;
    let dropoutFrames = 0;

    return {
      reset() {
        baselineSamples = [];
        baseline = null;
        sawClosed = false;
        blinked = false;
        stableFrames = 0;
        dropoutFrames = 0;
      },
      update: (landmarks: faceapi.FaceLandmarks68 | null) => {
        if (!landmarks) {
          stableFrames = 0;
          dropoutFrames++;
          // A short dropout (1-4 missed frames) right after the face was
          // confidently tracked is treated as an implicit "eyes closed"
          // sample, since a pure EAR reading can otherwise never see the
          // moment of closure if the detector loses the face entirely.
          if (baseline !== null && dropoutFrames <= 4) {
            sawClosed = true;
          }
          return blinked;
        }

        dropoutFrames = 0;
        stableFrames++;
        const ear = this.averageEAR(landmarks);

        if (baseline === null) {
          baselineSamples.push(ear);
          if (baselineSamples.length >= CALIBRATION_FRAMES) {
            // Use the max observed EAR during calibration — most likely to
            // reflect eyes genuinely open rather than mid-blink.
            baseline = Math.max(...baselineSamples);
          }
          return false;
        }

        if (ear < baseline * CLOSED_RATIO) {
          sawClosed = true;
        } else if (sawClosed && stableFrames >= 2 && ear > baseline * OPEN_RATIO) {
          blinked = true;
        }
        return blinked;
      },
    };
  }
}
