import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import {
  getMyNotifications,
  markAsRead,
  registerDeviceToken,
  unregisterDeviceToken,
} from '../controllers/notification.controller';

const router = Router();

router.use(protect);

router.get('/', getMyNotifications);
router.patch('/read', markAsRead);
router.post('/register-device', registerDeviceToken);
router.post('/unregister-device', unregisterDeviceToken);

export default router;
