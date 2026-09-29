import mongoose from 'mongoose';

/**
 * DSA progress tracking — deliberately NOT a coding judge or LeetCode clone.
 * Students self-report solved problems; the platform aggregates per-topic
 * stats to find weak areas and feed the personalized preparation plan.
 */
export const DSA_TOPICS = [
  'arrays', 'strings', 'hashing', 'two-pointers', 'sliding-window',
  'stacks', 'queues', 'linked-lists', 'recursion', 'binary-search',
  'sorting', 'greedy', 'bit-manipulation', 'trees', 'binary-search-tree',
  'heaps', 'graphs', 'dynamic-programming', 'backtracking', 'tries',
  'disjoint-set', 'segment-trees', 'matrix', 'misc',
];

const dsaProblemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    platform: {
      type: String,
      enum: ['leetcode', 'geeksforgeeks', 'codeforces', 'hackerrank', 'other'],
      default: 'leetcode',
      index: true,
    },
    url: { type: String, trim: true },
    topic: { type: String, enum: DSA_TOPICS, required: true, index: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true, index: true },
    status: {
      type: String,
      enum: ['solved', 'attempted', 'revisit'],
      default: 'solved',
      index: true,
    },
    attempts: { type: Number, default: 1, min: 1 },
    notes: { type: String, maxlength: 1000 },
    solvedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Same problem shouldn't be logged twice per user; topic rollups scan user+topic.
dsaProblemSchema.index({ user: 1, title: 1, platform: 1 }, { unique: true });
dsaProblemSchema.index({ user: 1, topic: 1, difficulty: 1 });
dsaProblemSchema.index({ user: 1, solvedAt: -1 });

export const DSAProblem = mongoose.model('DSAProblem', dsaProblemSchema);
