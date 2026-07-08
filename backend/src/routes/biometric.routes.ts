import { Router } from 'express';
import { BiometricController } from '../controllers/biometric.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Enroll the authenticated user's face descriptor
router.post('/enroll', BiometricController.enroll);

export default router;
