import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest, validators } from '../middleware/validation.middleware';

const router = Router();

// Register
router.post(
  '/register',
  validateRequest({
    email: { required: true, type: 'string', custom: validators.email },
    password: { required: true, type: 'string', custom: validators.password },
    firstName: { required: true, type: 'string', minLength: 2 },
    lastName: { required: true, type: 'string', minLength: 2 },
    phone: { required: false, type: 'string', custom: validators.phone },
    companyId: { required: false, type: 'string' },
    companyName: { required: false, type: 'string', minLength: 2 },
    officeLatitude: { required: false, custom: validators.latitude },
    officeLongitude: { required: false, custom: validators.longitude },
  }),
  AuthController.register
);

// Login
router.post(
  '/login',
  validateRequest({
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string' },
  }),
  AuthController.login
);

// Refresh token
router.post('/refresh', AuthController.refreshToken);

// Get current user
router.get('/me', authMiddleware, AuthController.getCurrentUser);

// Logout
router.post('/logout', authMiddleware, AuthController.logout);

export default router;
