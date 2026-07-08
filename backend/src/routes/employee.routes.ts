import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(['manager', 'admin']));

router.get('/', EmployeeController.list);
router.post('/', EmployeeController.create);
router.put('/:id', EmployeeController.update);
router.delete('/:id', EmployeeController.remove);

export default router;
