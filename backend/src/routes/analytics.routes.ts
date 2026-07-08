import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Analytics routes (available to managers and admins)
router.use(roleMiddleware(['manager', 'admin']));

// Get company-wide statistics
router.get('/company-stats', AnalyticsController.getCompanyStats);

// Get employee statistics
router.get('/employee-stats', AnalyticsController.getEmployeeStats);

// Get daily statistics
router.get('/daily-stats', AnalyticsController.getDailyStats);

// Export payroll data
router.get('/export/payroll', AnalyticsController.exportPayrollData);

export default router;