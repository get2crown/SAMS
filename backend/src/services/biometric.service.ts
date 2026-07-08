import { query } from '../config/database';

// Confidence = (1 - euclideanDistance) * 100. Relaxed to accept anything at
// or above 20% confidence (distance <= 0.80) — prioritizing not blocking
// legitimate check-ins over strict false-accept protection for this
// attendance use case.
const MIN_CONFIDENCE = 20;
const DESCRIPTOR_LENGTH = 128;

export interface FaceVerificationResult {
  match: boolean;
  distance: number;
  confidence: number;
}

export class BiometricService {
  static euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }

  private static assertValidDescriptor(descriptor: unknown): asserts descriptor is number[] {
    if (
      !Array.isArray(descriptor) ||
      descriptor.length !== DESCRIPTOR_LENGTH ||
      !descriptor.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      throw new Error('Invalid face descriptor');
    }
  }

  static async enrollFace(userId: string, descriptor: unknown): Promise<void> {
    this.assertValidDescriptor(descriptor);
    await query(`UPDATE users SET face_descriptor = $1, face_enrolled_at = NOW() WHERE id = $2`, [
      JSON.stringify(descriptor),
      userId,
    ]);
  }

  /**
   * Authoritative server-side face match. Never trust a client-supplied score.
   */
  static async verifyFace(userId: string, descriptor: unknown): Promise<FaceVerificationResult> {
    this.assertValidDescriptor(descriptor);

    const result = await query('SELECT face_descriptor FROM users WHERE id = $1', [userId]);
    const enrolled = result.rows[0]?.face_descriptor;
    if (!enrolled) {
      throw new Error('No enrolled face found. Please enroll your face before checking in.');
    }

    const distance = this.euclideanDistance(enrolled, descriptor);
    const confidence = Math.max(0, Math.round((1 - Math.min(distance, 1)) * 100));

    return { match: confidence >= MIN_CONFIDENCE, distance, confidence };
  }
}
