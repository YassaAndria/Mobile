import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware';
import { restrictTo } from '../middlewares/authorize.middleware';
import { uploadDocument } from '../middlewares/upload.middleware';
import {
  listJobs,
  getJobDetail,
  applyToJob,
  createJob,
  getApplicants,
  updateJob,
  deleteJob,
  getAppliedJobs,
  getEmployerJobs,
  getMyEmployerJobs,
  reEvaluateApplicantMatch
} from '../controllers/job.controller';

const router = Router();

router.use(protect);

router.get('/applied', restrictTo('freelancer'), getAppliedJobs);
router.get('/employer/me', restrictTo('employer'), getMyEmployerJobs);
router.get('/', listJobs);
router.get('/:id', getJobDetail);
router.post('/:id/apply', uploadDocument.single('cv'), applyToJob);
router.post('/', restrictTo('employer'), createJob);
router.patch('/:id', restrictTo('employer'), updateJob);
router.delete('/:id', restrictTo('employer'), deleteJob);
router.get('/:id/applicants', restrictTo('employer'), getApplicants);
router.post('/:id/applicants/:userId/re-evaluate', restrictTo('employer'), reEvaluateApplicantMatch);

export default router;