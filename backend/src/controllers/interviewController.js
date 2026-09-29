import { interviewService } from '../services/interviewService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { allStrategies } from '../interviews/strategies.js';

export const interviewController = {
  /** Available round types — driven by the strategy registry, not a hardcoded list. */
  rounds: asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      data: allStrategies().map((s) => ({ round: s.round, label: s.label, focus: s.evaluationFocus() })),
    });
  }),

  create: asyncHandler(async (req, res) => {
    const interview = await interviewService.create(req.user._id, req.body);
    res.status(201).json({
      success: true,
      data: { interviewId: interview._id, targetRole: interview.targetRole, rounds: interview.rounds },
      message: 'Interview created. Connect to the /interview WebSocket namespace to begin.',
    });
  }),

  list: asyncHandler(async (req, res) => {
    const { items, meta } = await interviewService.list(req.user._id, req.query);
    res.json({ success: true, data: items, meta });
  }),

  get: asyncHandler(async (req, res) => {
    const interview = await interviewService.getOwned(req.params.id, req.user._id);
    res.json({ success: true, data: interview });
  }),

  report: asyncHandler(async (req, res) => {
    const { interview, transcript } = await interviewService.getReport(req.params.id, req.user._id);
    res.json({ success: true, data: { interview, transcript } });
  }),

  abandon: asyncHandler(async (req, res) => {
    const interview = await interviewService.abandon(req.params.id, req.user._id);
    res.json({ success: true, data: interview });
  }),
};
