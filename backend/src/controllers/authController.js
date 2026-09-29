import { authService } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { user, token } = await authService.register(req.body);
    res.status(201).json({ success: true, data: { user, token } });
  }),

  login: asyncHandler(async (req, res) => {
    const { user, token } = await authService.login(req.body);
    res.json({ success: true, data: { user, token } });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user._id);
    res.json({ success: true, data: user });
  }),

  changePassword: asyncHandler(async (req, res) => {
    await authService.changePassword(req.user._id, req.body);
    res.json({ success: true, message: 'Password updated' });
  }),
};
