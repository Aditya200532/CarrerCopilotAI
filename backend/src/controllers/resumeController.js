import { resumeService } from '../services/resumeService.js';
import { analysisService } from '../services/analysisService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const resumeController = {
  upload: asyncHandler(async (req, res) => {
    const result = await resumeService.upload(req.user._id, req.file);
    // 202 Accepted: analysis continues asynchronously via the worker queue.
    res.status(202).json({
      success: true,
      data: result,
      message: 'Resume uploaded. AI analysis is queued — poll the analysis endpoint or wait for a notification.',
    });
  }),

  list: asyncHandler(async (req, res) => {
    const { items, meta } = await resumeService.list(req.user._id, req.query);
    res.json({ success: true, data: items, meta });
  }),

  delete: asyncHandler(async (req, res) => {
    await resumeService.delete(req.user._id, req.params.id);
    res.json({ success: true, message: 'Resume deleted' });
  }),
};

export const analysisController = {
  status: asyncHandler(async (req, res) => {
    const analysis = await analysisService.getStatus(req.params.id, req.user._id);
    res.json({ success: true, data: analysis });
  }),

  list: asyncHandler(async (req, res) => {
    const { items, meta } = await analysisService.listForUser(req.user._id, req.query);
    res.json({ success: true, data: items, meta });
  }),

  latest: asyncHandler(async (req, res) => {
    const analysis = await analysisService.latest(req.user._id, req.params.type);
    res.json({ success: true, data: analysis });
  }),

  requestSkillGap: asyncHandler(async (req, res) => {
    const result = await analysisService.requestSkillGap(req.user._id, req.body.jobId);
    res.status(202).json({
      success: true,
      data: result,
      message: 'Skill-gap analysis queued. It combines your profile, resume skills and the job requirements.',
    });
  }),

  requestRoadmap: asyncHandler(async (req, res) => {
    const result = await analysisService.requestRoadmap(req.user._id, req.body);
    res.status(202).json({
      success: true,
      data: result,
      message: 'Roadmap generation queued.',
    });
  }),
};
