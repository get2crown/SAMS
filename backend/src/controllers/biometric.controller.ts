import { Request, Response } from 'express';
import { BiometricService } from '../services/biometric.service';

export class BiometricController {
  /**
   * Enroll (or re-enroll) the authenticated user's face descriptor
   */
  static async enroll(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await BiometricService.enrollFace(req.user.id, req.body.descriptor);

      res.json({ message: 'Face enrolled successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
