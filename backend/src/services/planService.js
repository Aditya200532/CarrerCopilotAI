import { PreparationPlan, PreparationTask } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { emit, EVENTS } from '../events/bus.js';

export const planService = {
  async getActivePlan(userId) {
    const plan = await PreparationPlan.findOne({ user: userId, status: 'active' }).sort({ createdAt: -1 }).lean();
    if (!plan) return null;
    const tasks = await PreparationTask.find({ plan: plan._id }).sort({ order: 1 }).lean();
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return {
      plan,
      tasks,
      progress: {
        total: tasks.length,
        completed,
        inProgress: tasks.filter((t) => t.status === 'in_progress').length,
        percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
      },
    };
  },

  async updateTaskStatus(userId, taskId, status) {
    const update = { status };
    if (status === 'completed') update.completedAt = new Date();
    if (status === 'pending') { update.completedAt = null; }

    const task = await PreparationTask.findOneAndUpdate({ _id: taskId, user: userId }, update, { new: true });
    if (!task) throw ApiError.notFound('Task not found');

    if (status === 'completed') {
      emit(EVENTS.TASK_COMPLETED, {
        userId, taskId: String(task._id), planId: String(task.plan), taskTitle: task.title,
      });
      // Auto-complete the plan when every task is done.
      const remaining = await PreparationTask.countDocuments({ plan: task.plan, status: { $ne: 'completed' } });
      if (remaining === 0) {
        await PreparationPlan.updateOne({ _id: task.plan }, { status: 'completed' });
      }
    }
    return task;
  },

  async listTasks(userId, query) {
    const filter = { user: userId };
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    const activePlan = await PreparationPlan.findOne({ user: userId, status: 'active' }).select('_id').lean();
    if (query.scope !== 'all' && activePlan) filter.plan = activePlan._id;

    return PreparationTask.find(filter).sort({ order: 1 }).limit(200).lean();
  },
};
