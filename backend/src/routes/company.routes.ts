import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Any authenticated user can see their own company's settings
router.get('/me', CompanyController.getMine);

// Only admins can change them
router.put('/me', roleMiddleware(['admin']), CompanyController.updateMine);

export default router;
