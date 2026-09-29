import { Notification } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, buildPageMeta } from '../utils/pagination.js';

export const notificationQueryService = {
  async list(userId, query) {
    const { page, limit, skip } = getPagination(query, { defaultLimit: 15 });
    const filter = { user: userId };
    if (query.unread === 'true') filter.read = false;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: userId, read: false }),
    ]);
    return { items, meta: buildPageMeta(total, page, limit), unreadCount };
  },

  async markRead(userId, id) {
    const n = await Notification.findOneAndUpdate({ _id: id, user: userId }, { read: true }, { new: true });
    if (!n) throw ApiError.notFound('Notification not found');
    return n;
  },

  async markAllRead(userId) {
    const res = await Notification.updateMany({ user: userId, read: false }, { read: true });
    return { updated: res.modifiedCount };
  },
};
