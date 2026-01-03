import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../services/emailService.js';

/**
 * @desc    Login user (admin/worker)
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect Email or Password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect Email or Password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    // Get public profile
    const userProfile = user.getPublicProfile();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userProfile
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('branch', 'name code');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    // In a real app, you might want to blacklist the token
    // For now, we'll just send a success response
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
};

/**
 * @desc    Update password
 * @route   PUT /api/v1/auth/update-password
 * @access  Private
 */
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: { token }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/v1/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url
    // Frontend URL should be defined in env, defaulting to localhost:5173 for dev
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // NOTE: Frontend route expected is /reset-password/:token
    // Adjust this path if the frontend route is different
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(user, resetUrl);

      res.status(200).json({
        success: true,
        message: 'Email sent'
      });
    } catch (err) {
      console.error('Email send failed:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

/**
 * @desc    Reset password
 * @route   PUT /api/v1/auth/reset-password/:resetToken
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new JWT
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: { token }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

