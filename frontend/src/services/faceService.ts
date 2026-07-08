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
const CLOSED_RATIO = 0.78; // dip to 78% of baseline counts as "closed"
const OPEN_RATIO = 0.92; // recovering to 92% of baseline counts as "open" again

export interface LivenessTracker {
  reset(): void;
  update(landmarks: faceapi.FaceLandmarks68): boolean; // returns true once a blink has been observed
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

    return {
      reset() {
        baselineSamples = [];
        baseline = null;
        sawClosed = false;
        blinked = false;
      },
      update: (landmarks: faceapi.FaceLandmarks68) => {
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
        } else if (sawClosed && ear > baseline * OPEN_RATIO) {
          blinked = true;
        }
        return blinked;
      },
    };
  }
}
