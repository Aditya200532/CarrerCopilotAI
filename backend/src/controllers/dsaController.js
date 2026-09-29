import { dsaService } from '../services/dsaService.js';
import { DSA_TOPICS } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const dsaController = {
  topics: asyncHandler(async (_req, res) => {
    res.json({ success: true, data: DSA_TOPICS });
  }),

  stats: asyncHandler(async (req, res) => {
    const stats = await dsaService.getStats(req.user._id);
    res.json({ success: true, data: stats });
  }),

  list: asyncHandler(async (req, res) => {
    const { items, meta } = await dsaService.listProblems(req.user._id, req.query);
    res.json({ success: true, data: items, meta });
  }),

  add: asyncHandler(async (req, res) => {
    const problem = await dsaService.addProblem(req.user._id, req.body);
    res.status(201).json({ success: true, data: problem });
  }),

  update: asyncHandler(async (req, res) => {
    const problem = await dsaService.updateProblem(req.user._id, req.params.id, req.body);
    res.json({ success: true, data: problem });
  }),

  remove: asyncHandler(async (req, res) => {
    await dsaService.deleteProblem(req.user._id, req.params.id);
    res.json({ success: true, message: 'Problem removed' });
  }),
};
