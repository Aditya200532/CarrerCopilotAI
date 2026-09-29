import mongoose from 'mongoose';

const preparationTaskSchema = new mongoose.Schema(
  {
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PreparationPlan',
      required: true,
      index: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 300 },
    description: { type: String, maxlength: 2000 },
    category: {
      type: String,
      enum: ['dsa', 'language', 'sql', 'backend', 'system-design', 'lld', 'project', 'aptitude', 'soft-skills', 'other'],
      required: true,
      index: true,
    },
    topic: { type: String, trim: true }, // e.g. "Graphs — BFS/DFS"
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium', index: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
      index: true,
    },
    order: { type: Number, default: 0 },
    estimatedHours: { type: Number, min: 0 },
    resources: [{ type: String }],
    dueDate: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Dashboard query: "my pending tasks, ordered".
preparationTaskSchema.index({ user: 1, status: 1, order: 1 });

export const PreparationTask = mongoose.model('PreparationTask', preparationTaskSchema);
