import { planService } from '../services/planService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const planController = {
  active: asyncHandler(async (req, res) => {
    const data = await planService.getActivePlan(req.user._id);
    res.json({ success: true, data });
  }),

  tasks: asyncHandler(async (req, res) => {
    const tasks = await planService.listTasks(req.user._id, req.query);
    res.json({ success: true, data: tasks });
  }),

  updateTask: asyncHandler(async (req, res) => {
    const task = await planService.updateTaskStatus(req.user._id, req.params.id, req.body.status);
    res.json({ success: true, data: task });
  }),
};
