import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    storedPath: { type: String, required: true },
    mimeType: { type: String },
    sizeBytes: { type: Number },
    extractedText: { type: String }, // parsed text (PDF); capped below to keep docs sane
    /** Text hash — identical resumes don't need re-analysis (cache/queue dedup). */
    textHash: { type: String, index: true },
    analysis: {
      status: {
        type: String,
        enum: ['pending', 'queued', 'processing', 'completed', 'failed'],
        default: 'pending',
        index: true,
      },
      analysis: { type: mongoose.Schema.Types.ObjectId, ref: 'AIAnalysis' },
      queuedAt: Date,
      completedAt: Date,
      error: String,
    },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

resumeSchema.pre('validate', function (next) {
  // Keep resume documents under MongoDB's 16MB doc limit with large PDFs.
  if (this.extractedText && this.extractedText.length > 60000) {
    this.extractedText = this.extractedText.slice(0, 60000);
  }
  next();
});

export const Resume = mongoose.model('Resume', resumeSchema);
