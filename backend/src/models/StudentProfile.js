import mongoose from 'mongoose';

const proficiency = { type: Number, min: 1, max: 5, default: 3 };

const skillEntrySchema = new mongoose.Schema(
  { name: { type: String, required: true, trim: true }, proficiency },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, required: true, trim: true }, // e.g. "B.Tech"
    field: { type: String, trim: true }, // e.g. "Information Technology"
    institution: { type: String, trim: true },
    startYear: { type: Number },
    endYear: { type: Number },
    cgpa: { type: Number, min: 0, max: 10 },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 2000 },
    techStack: [{ type: String, trim: true }],
    link: { type: String, trim: true },
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    issuer: { type: String, trim: true },
    year: { type: Number },
  },
  { _id: false }
);

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    headline: { type: String, trim: true, maxlength: 160 },
    graduationYear: { type: Number, min: 2000, max: 2100 },
    education: { type: [educationSchema], default: [] },
    targetRoles: [{ type: String, trim: true }], // e.g. "Java Backend Developer"

    programmingLanguages: { type: [skillEntrySchema], default: [] },
    frameworks: { type: [skillEntrySchema], default: [] },
    databases: { type: [skillEntrySchema], default: [] },
    tools: [{ type: String, trim: true }],

    projects: { type: [projectSchema], default: [] },
    certifications: { type: [certificationSchema], default: [] },

    links: {
      github: { type: String, trim: true },
      linkedin: { type: String, trim: true },
      portfolio: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

/** Flat list of every skill name a student claims — used for job matching. */
studentProfileSchema.methods.allSkillNames = function () {
  return [
    ...this.programmingLanguages.map((s) => s.name),
    ...this.frameworks.map((s) => s.name),
    ...this.databases.map((s) => s.name),
    ...this.tools,
    ...this.projects.flatMap((p) => p.techStack),
  ];
};

export const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
