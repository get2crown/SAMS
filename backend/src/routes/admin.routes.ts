import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(['super_admin']));

router.get('/companies', AdminController.listCompanies);
router.put('/companies/:id', AdminController.updateCompany);
router.get('/companies/:id/users', AdminController.listCompanyUsers);
router.put('/users/:id', AdminController.updateUser);

export default router;
