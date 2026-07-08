import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { validateRequest, validators } from '../middleware/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Check-in
router.post(
  '/check-in',
  validateRequest({
    latitude: { required: true, custom: validators.latitude },
    longitude: { required: true, custom: validators.longitude },
    accuracy: { required: true, type: 'number' },
    faceDescriptor: { required: false, type: 'array' },
    faceImagePath: { required: false, type: 'string' },
  }),
  AttendanceController.checkIn
);

// Check-out
router.post('/check-out', AttendanceController.checkOut);

// Get the caller's current active check-in (if any)
router.get('/current', AttendanceController.getCurrentStatus);

// Get today's stats (manager/admin)
router.get(
  '/stats/today',
  roleMiddleware(['manager', 'admin']),
  AttendanceController.getTodayStats
);

// Get personal attendance history
router.get(
  '/history',
  validateRequest({
    startDate: { required: true, type: 'string' },
    endDate: { required: true, type: 'string' },
  }),
  AttendanceController.getHistory
);

// Get employee attendance (manager/admin)
router.get(
  '/employee/:employeeId/history',
  roleMiddleware(['manager', 'admin']),
  validateRequest({
    startDate: { required: true, type: 'string' },
    endDate: { required: true, type: 'string' },
  }),
  AttendanceController.getEmployeeAttendance
);

export default router;
