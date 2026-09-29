import { getChannel } from '../../src/notifications/channels.js';
import { io } from '../../src/realtime/gateway.js';

/**
 * Processor: notifications
 * Payload: { userId, type, channel, title, message, data, link }
 * Delivery is strategy-based (see notifications/channels.js). For in-app we
 * additionally push over the realtime gateway so connected clients see it
 * instantly without polling.
 */
export async function processNotification(job) {
  const { userId, type, channel = 'in-app', title, message, data, link } = job.data;

  const doc = await getChannel(channel).send({ userId, type, title, message, data, link });

  if (channel === 'in-app' && io && doc?._id) {
    io.to(`user:${userId}`).emit('notification:new', {
      _id: doc._id, type, title, message, data, link, createdAt: doc.createdAt,
    });
  }
  return { delivered: true, channel };
}
