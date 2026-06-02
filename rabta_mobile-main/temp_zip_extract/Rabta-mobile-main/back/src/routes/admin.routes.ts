import { Router } from 'express';
import {
  getAdminStats,
  getAllUsers,
  toggleBanUser,
  getAllJobs,
  deleteJob,
  getAllGroups,
  deleteGroup
} from '../controllers/admin.controller';
import { protect } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';

const router = Router();

// Secure all admin routes with authentication and admin authorization
router.use(protect);
router.use(isAdmin);

// Stats
router.get('/stats', getAdminStats);

// Users
router.get('/users', getAllUsers);
router.put('/users/:id/ban', toggleBanUser);

// Jobs
router.get('/jobs', getAllJobs);
router.delete('/jobs/:id', deleteJob);

// Groups
router.get('/groups', getAllGroups);
router.delete('/groups/:id', deleteGroup);

export default router;
