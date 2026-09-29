import { dashboardService } from '../services/dashboardService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const dashboardController = {
  stats: asyncHandler(async (req, res) => {
    const stats = await dashboardService.getStats(req.user._id);
    res.json({ success: true, data: stats });
  }),
};
