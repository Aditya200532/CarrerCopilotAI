import { User, StudentProfile } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../middleware/auth.js';

/**
 * Authentication business logic. Controllers stay thin; this service owns
 * user creation, credential checks and token issuance.
 */
export const authService = {
  async register({ name, email, password }) {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) throw ApiError.conflict('An account with this email already exists');

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({ name, email, passwordHash });
    // Every student gets a profile document immediately so the UI never 404s.
    await StudentProfile.create({ user: user._id });

    return { user, token: signToken(user) };
  },

  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    user.lastLoginAt = new Date();
    await user.save();
    return { user, token: signToken(user) };
  },

  async getMe(userId) {
    const user = await User.findById(userId).select('_id name email role lastLoginAt createdAt');
    if (!user) throw ApiError.notFound('User not found');
    return user;
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId);
    if (!(await user.comparePassword(currentPassword))) {
      throw ApiError.badRequest('Current password is incorrect');
    }
    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();
  },
};
