import mongoose from 'mongoose';

const interviewQuestionSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true, index: true },
    round: { type: String, required: true, index: true },
    kind: { type: String, enum: ['primary', 'followup'], default: 'primary' },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewQuestion' },
    text: { type: String, required: true },
    topic: { type: String },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    askedAt: { type: Date, default: Date.now },
    fromCache: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const InterviewQuestion = mongoose.model('InterviewQuestion', interviewQuestionSchema);

const interviewResponseSchema = new mongoose.Schema(
  {
    interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', required: true, index: true },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewQuestion',
      required: true,
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 8000 },
    answeredAt: { type: Date, default: Date.now },
    /** Filled in asynchronously by the report pipeline / lightweight evaluation. */
    evaluation: {
      rating: { type: Number, min: 1, max: 5 },
      feedback: String,
    },
  },
  { timestamps: true }
);

export const InterviewResponse = mongoose.model('InterviewResponse', interviewResponseSchema);
