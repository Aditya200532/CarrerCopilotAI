import { notificationQueryService } from '../services/notificationQueryService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    const { items, meta, unreadCount } = await notificationQueryService.list(req.user._id, req.query);
    res.json({ success: true, data: items, meta, unreadCount });
  }),

  markRead: asyncHandler(async (req, res) => {
    const n = await notificationQueryService.markRead(req.user._id, req.params.id);
    res.json({ success: true, data: n });
  }),

  markAllRead: asyncHandler(async (req, res) => {
    const result = await notificationQueryService.markAllRead(req.user._id);
    res.json({ success: true, data: result });
  }),
};
