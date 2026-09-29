import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema, updatePasswordSchema } from '../validations/authSchemas.js';

const router = Router();

router.post('/register', validate({ body: registerSchema }), authController.register);
router.post('/login', validate({ body: loginSchema }), authController.login);
router.get('/me', requireAuth, authController.me);
router.post('/change-password', requireAuth, validate({ body: updatePasswordSchema }), authController.changePassword);

export default router;
