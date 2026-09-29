import mongoose from 'mongoose';

export const INTERVIEW_ROUNDS = ['resume', 'oop-java', 'dsa', 'sql', 'backend', 'lld', 'system-design'];

const roundStateSchema = new mongoose.Schema(
  {
    type: { type: String, enum: INTERVIEW_ROUNDS, required: true },
    status: { type: String, enum: ['pending', 'active', 'completed'], default: 'pending' },
    questionsAsked: { type: Number, default: 0 },
    startedAt: Date,
    completedAt: Date,
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetRole: { type: String, required: true }, // e.g. "Java Backend Developer"
    rounds: { type: [roundStateSchema], default: [], required: true },
    status: {
      type: String,
      enum: ['created', 'in_progress', 'completed', 'abandoned'],
      default: 'created',
      index: true,
    },
    settings: {
      maxQuestionsPerRound: { type: Number, default: 3, min: 1, max: 8 },
      difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'mixed'], default: 'mixed' },
      allowFollowUps: { type: Boolean, default: true },
    },
    startedAt: Date,
    completedAt: Date,
    /** Final AI report (also referenced by an AIAnalysis of type interview-report). */
    report: {
      overallRating: { type: Number, min: 1, max: 10 },
      verdict: { type: String, enum: ['not-ready', 'needs-practice', 'ready', 'strong'] },
      strengths: [String],
      improvements: [String],
      technicalFeedback: [String],
      recommendedTopics: [String],
      roundSummaries: [
        {
          round: String,
          rating: Number,
          summary: String,
          _id: false,
        },
      ],
      generatedAt: Date,
    },
    reportAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis' },
  },
  { timestamps: true }
);

interviewSchema.index({ user: 1, createdAt: -1 });

export const Interview = mongoose.model('Interview', interviewSchema);
