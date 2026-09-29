import { Router } from 'express';
import { profileController } from '../controllers/profileController.js';
import { skillController } from '../controllers/skillController.js';
import { jobController } from '../controllers/jobController.js';
import { resumeController, analysisController } from '../controllers/resumeController.js';
import { planController } from '../controllers/planController.js';
import { dsaController } from '../controllers/dsaController.js';
import { interviewController } from '../controllers/interviewController.js';
import { notificationController } from '../controllers/notificationController.js';
import { dashboardController } from '../controllers/dashboardController.js';
import { aiController } from '../controllers/aiController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { resumeUpload } from '../services/resumeService.js';
import {
  profileUpdateSchema, jobCreateSchema, jobListQuerySchema,
  dsaProblemSchema, dsaProblemUpdateSchema, dsaListQuerySchema,
  taskUpdateSchema, roadmapRequestSchema, skillGapRequestSchema,
  interviewCreateSchema, explainTopicSchema, idParamSchema,
} from '../validations/schemas.js';

const router = Router();

// Everything below requires a valid JWT.
router.use(requireAuth);

router.get('/dashboard/stats', dashboardController.stats);

router.get('/profile', profileController.get);
router.put('/profile', validate({ body: profileUpdateSchema }), profileController.update);

router.get('/skills', skillController.search);
router.get('/skills/categories', skillController.listCategories);

router.get('/jobs', validate({ query: jobListQuerySchema }), jobController.list);
router.post('/jobs', validate({ body: jobCreateSchema }), jobController.create);
router.get('/jobs/:id', validate({ params: idParamSchema }), jobController.get);
router.get('/jobs/:id/match', validate({ params: idParamSchema }), jobController.match);
router.delete('/jobs/:id', validate({ params: idParamSchema }), jobController.archive);

router.post('/resumes', resumeUpload.single('resume'), resumeController.upload);
router.get('/resumes', resumeController.list);
router.delete('/resumes/:id', validate({ params: idParamSchema }), resumeController.delete);

router.get('/analysis', analysisController.list);
router.get('/analysis/latest/:type', analysisController.latest);
router.get('/analysis/:id', validate({ params: idParamSchema }), analysisController.status);
router.post('/analysis/skill-gap', aiLimiter, validate({ body: skillGapRequestSchema }), analysisController.requestSkillGap);
router.post('/analysis/roadmap', aiLimiter, validate({ body: roadmapRequestSchema }), analysisController.requestRoadmap);

router.get('/plan', planController.active);
router.get('/plan/tasks', planController.tasks);
router.patch('/plan/tasks/:id', validate({ params: idParamSchema, body: taskUpdateSchema }), planController.updateTask);

router.get('/dsa/topics', dsaController.topics);
router.get('/dsa/stats', dsaController.stats);
router.get('/dsa/problems', validate({ query: dsaListQuerySchema }), dsaController.list);
router.post('/dsa/problems', validate({ body: dsaProblemSchema }), dsaController.add);
router.patch('/dsa/problems/:id', validate({ params: idParamSchema, body: dsaProblemUpdateSchema }), dsaController.update);
router.delete('/dsa/problems/:id', validate({ params: idParamSchema }), dsaController.remove);

router.get('/interviews/rounds', interviewController.rounds);
router.post('/interviews', validate({ body: interviewCreateSchema }), interviewController.create);
router.get('/interviews', interviewController.list);
router.get('/interviews/:id', validate({ params: idParamSchema }), interviewController.get);
router.get('/interviews/:id/report', validate({ params: idParamSchema }), interviewController.report);
router.post('/interviews/:id/abandon', validate({ params: idParamSchema }), interviewController.abandon);

router.get('/notifications', notificationController.list);
router.patch('/notifications/read-all', notificationController.markAllRead);
router.patch('/notifications/:id/read', validate({ params: idParamSchema }), notificationController.markRead);

// Direct LLM endpoint — rate limited + Redis-cached for reusable topics.
router.post('/ai/explain', aiLimiter, validate({ body: explainTopicSchema }), aiController.explainTopic);
router.get('/ai/status', aiController.status);

export default router;
