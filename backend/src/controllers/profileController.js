import { profileService } from '../services/profileService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const profileController = {
  get: asyncHandler(async (req, res) => {
    const profile = await profileService.getProfile(req.user._id);
    res.json({ success: true, data: profile });
  }),

  update: asyncHandler(async (req, res) => {
    const profile = await profileService.updateProfile(req.user._id, req.body);
    res.json({ success: true, data: profile });
  }),
};
