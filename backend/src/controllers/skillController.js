import { Skill } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { normalizeSkillName } from '../utils/skills.js';

export const skillController = {
  /** Autocomplete/search over the canonical catalog, with category filter. */
  search: asyncHandler(async (req, res) => {
    const q = normalizeSkillName(req.query.q || '');
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { displayName: { $regex: q, $options: 'i' } },
        { aliases: { $regex: q, $options: 'i' } },
      ];
    }
    const skills = await Skill.find(filter).limit(30).sort({ name: 1 }).lean();
    res.json({ success: true, data: skills });
  }),

  listCategories: asyncHandler(async (_req, res) => {
    const categories = await Skill.distinct('category');
    res.json({ success: true, data: categories });
  }),
};
