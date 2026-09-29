import { StudentProfile } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const profileService = {
  async getProfile(userId) {
    let profile = await StudentProfile.findOne({ user: userId });
    if (!profile) profile = await StudentProfile.create({ user: userId });
    return profile;
  },

  async updateProfile(userId, updates) {
    const profile = await StudentProfile.findOneAndUpdate({ user: userId }, updates, {
      new: true,
      runValidators: true,
    });
    if (!profile) throw ApiError.notFound('Profile not found');
    return profile;
  },
};
