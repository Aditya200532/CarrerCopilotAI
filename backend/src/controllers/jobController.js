import { jobService } from '../services/jobService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const jobController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta } = await jobService.list(req.query, req.user._id);
    res.json({ success: true, data: items, meta });
  }),

  get: asyncHandler(async (req, res) => {
    const job = await jobService.getById(req.params.id, req.user._id);
    res.json({ success: true, data: job });
  }),

  create: asyncHandler(async (req, res) => {
    const job = await jobService.create(req.body, req.user._id);
    res.status(201).json({
      success: true,
      data: job,
      message: job.requiredSkills.length
        ? 'Job saved.'
        : 'Job saved — AI is extracting required skills in the background.',
    });
  }),

  match: asyncHandler(async (req, res) => {
    const result = await jobService.match(req.params.id, req.user._id);
    res.json({ success: true, data: result });
  }),

  archive: asyncHandler(async (req, res) => {
    const job = await jobService.archive(req.params.id, req.user._id);
    res.json({ success: true, data: job });
  }),
};
