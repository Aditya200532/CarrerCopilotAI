import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'analysis-complete',
        'analysis-failed',
        'interview-scheduled',
        'interview-report-ready',
        'task-completed',
        'plan-generated',
        'system',
      ],
      required: true,
    },
    channel: { type: String, enum: ['in-app', 'email', 'push'], default: 'in-app', index: true },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1000 },
    data: { type: mongoose.Schema.Types.Mixed }, // e.g. { analysisId, jobId, interviewId } for deep links
    link: { type: String }, // frontend route, e.g. "/analysis/123"
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// "my unread notifications, newest first" — the hot query.
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
