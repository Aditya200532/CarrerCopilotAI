import mongoose from 'mongoose';

/**
 * Durable record of every AI-powered analysis. The queue is transient (Redis);
 * this collection is the source of truth the frontend polls for status/result.
 * Personalized results live HERE, not in the shared Redis cache.
 */
const aiAnalysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['resume-analysis', 'skill-gap', 'roadmap', 'job-skill-extraction', 'interview-report'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
      index: true,
    },
    input: {
      resume: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
      job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
      interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
    },
    result: { type: mongoose.Schema.Types.Mixed }, // structured JSON produced by the LLM
    error: { type: String },
    model: { type: String },
    attempts: { type: Number, default: 0 },
    queuedAt: { type: Date, default: Date.now },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// "latest analysis of type X for user Y" is the dominant query pattern.
aiAnalysisSchema.index({ user: 1, type: -1, createdAt: -1 });

export const AIAnalysis = mongoose.model('AIAnalysis', aiAnalysisSchema);
