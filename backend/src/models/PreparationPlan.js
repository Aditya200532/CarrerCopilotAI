import mongoose from 'mongoose';

const preparationPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    title: { type: String, required: true },
    targetRole: { type: String },
    generatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis' },
    status: {
      type: String,
      enum: ['active', 'completed', 'archived'],
      default: 'active',
      index: true,
    },
    overview: { type: String, maxlength: 4000 },
    startDate: { type: Date, default: Date.now },
    targetDate: { type: Date },
  },
  { timestamps: true }
);

// One active plan per user keeps the dashboard unambiguous.
preparationPlanSchema.index({ user: 1, status: 1 });

export const PreparationPlan = mongoose.model('PreparationPlan', preparationPlanSchema);
