import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { getMyNotifications, markAsRead } from '../controllers/notification.controller';

const router = Router();

router.use(protect);

router.get('/', getMyNotifications);
router.patch('/read', markAsRead);

export default router;
