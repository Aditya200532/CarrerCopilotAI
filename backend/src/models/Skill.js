import mongoose from 'mongoose';

/**
 * Canonical skill catalog. Keeps matching explainable: AI-extracted skills are
 * mapped onto catalog entries (via aliases), so "React.js" and "react" are the
 * same skill. Entries can be seeded or created on demand by extraction jobs.
 */
const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['language', 'framework', 'database', 'tool', 'cloud', 'concept', 'dsa-topic', 'soft-skill', 'other'],
      default: 'other',
      index: true,
    },
    aliases: { type: [String], default: [] }, // lowercase variants resolved to `name`
  },
  { timestamps: true }
);

/** Builds an in-memory alias -> canonical name map. Small collection by design. */
skillSchema.statics.buildAliasMap = async function () {
  const skills = await this.find({}, { name: 1, aliases: 1 }).lean();
  const map = new Map();
  for (const s of skills) {
    map.set(s.name, s.name);
    for (const alias of s.aliases) map.set(alias.toLowerCase(), s.name);
  }
  return map;
};

export const Skill = mongoose.model('Skill', skillSchema);
