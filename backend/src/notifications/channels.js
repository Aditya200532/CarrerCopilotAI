import { Notification } from '../models/index.js';

/**
 * LLD — Strategy pattern for notification delivery.
 *
 * NotificationChannel is the common interface; each channel implements it.
 * The dispatcher picks the channel by name, so adding e.g. WhatsApp later is
 * one new class + one registry entry (Open/Closed Principle).
 */
export class NotificationChannel {
  /** @returns {string} channel name: 'in-app' | 'email' | 'push' */
  get name() {
    throw new Error('Not implemented');
  }
  /** @param {{userId, title, message, data?, link?}} payload */
  async send(_payload) {
    throw new Error('Not implemented');
  }
}

export class InAppNotificationChannel extends NotificationChannel {
  get name() {
    return 'in-app';
  }
  async send({ userId, type, title, message, data, link }) {
    return Notification.create({ user: userId, type, channel: 'in-app', title, message, data, link });
  }
}

export class EmailNotificationChannel extends NotificationChannel {
  get name() {
    return 'email';
  }
  async send({ userId, title, message }) {
    // Stub: wire an SMTP/SES provider here. The architecture already routes
    // through this interface, so no caller changes are needed.
    console.info(`[notify:email] (stub) to=${userId} "${title}" — ${message}`);
    return { delivered: false, reason: 'email provider not configured' };
  }
}

export class PushNotificationChannel extends NotificationChannel {
  get name() {
    return 'push';
  }
  async send({ userId, title, message }) {
    // Stub: wire FCM/Web Push here.
    console.info(`[notify:push] (stub) to=${userId} "${title}" — ${message}`);
    return { delivered: false, reason: 'push provider not configured' };
  }
}

const channels = [
  new InAppNotificationChannel(),
  new EmailNotificationChannel(),
  new PushNotificationChannel(),
];

const channelRegistry = new Map(channels.map((c) => [c.name, c]));

export function getChannel(name) {
  return channelRegistry.get(name) || channelRegistry.get('in-app');
}
