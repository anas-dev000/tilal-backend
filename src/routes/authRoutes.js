import express from 'express';
import { login, getMe, logout, updatePassword, forgotPassword, resetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { loginValidation } from '../middleware/validator.js';

const router = express.Router();

router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/update-password', protect, updatePassword);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);

export default router;

