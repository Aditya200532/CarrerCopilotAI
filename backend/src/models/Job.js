import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    company: { type: String, trim: true, maxlength: 200 },
    role: { type: String, trim: true, index: true }, // normalized role, e.g. "backend developer"
    location: { type: String, trim: true },
    type: {
      type: String,
      enum: ['internship', 'full-time', 'placement', 'other'],
      default: 'placement',
      index: true,
    },
    description: { type: String, required: true }, // full JD text
    requiredSkills: { type: [String], default: [], index: true }, // canonical lowercase names
    niceToHaveSkills: { type: [String], default: [] },
    responsibilities: { type: [String], default: [] },
    minSalary: { type: Number },
    maxSalary: { type: Number },
    experienceLevel: { type: String, enum: ['fresher', 'intern', 'junior', 'mid', 'any'], default: 'fresher' },
    source: { type: String, enum: ['pasted', 'manual'], default: 'pasted' },
    skillsExtractedByAI: { type: Boolean, default: false },
    /** Set once extraction has run, even if the JD yielded zero skills, so retries don't loop. */
    skillsExtractedAt: { type: Date },
    /** Hash of the JD text — lets AI skill extraction reuse cached results for identical JDs. */
    descriptionHash: { type: String, index: true },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active', index: true },
  },
  { timestamps: true }
);

// Text search across the fields students actually search on.
jobSchema.index({ title: 'text', company: 'text', description: 'text', role: 'text' });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ requiredSkills: 1, type: 1 }); // "jobs requiring mongodb, internships"

export const Job = mongoose.model('Job', jobSchema);
