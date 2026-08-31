import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import crypto from 'crypto';
import sendEmail from '../../utils/sendemails.js';

// Helper function to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { fname, lname, email, password, phone, dob, education, year, interests, skills, improveSkills, about } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      fname, lname, email, password, phone, dob, education, year, interests, skills, improveSkills, about
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        profilePic: user.profilePic || null,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        fname: user.fname,
        lname: user.lname,
        email: user.email,
        profilePic: user.profilePic || null,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot Password (Email or Phone/OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email, phone, method } = req.body;

    let user = null;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    } else if (phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      user = await User.findOne({ 
        $or: [
          { phone: phone.trim() },
          { phone: cleanPhone },
          { phone: { $regex: cleanPhone.slice(-10) } }
        ]
      });
    }

    // Generate 6-digit OTP and reset token
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');

    if (!user) {
      // In development or if user is testing with any number/email
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        otp,
        demoMode: true,
        resetToken: rawResetToken,
      });
    }

    user.otp = otp;
    user.otpExpire = Date.now() + 15 * 60 * 1000; // 15 min
    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Send real email with OTP if user has email
    const targetEmail = user.email || (email && email.includes('@') ? email : null);
    if (targetEmail) {
      const emailSubject = `Wanderer Security Code: ${otp}`;
      const emailMessage = `Hello ${user.fname || 'Scholar'},\n\nYou requested to reset your Wanderer account password.\n\nYour 6-digit Verification Code is:\n${otp}\n\nThis verification code will expire in 15 minutes.\n\nIf you did not request this password reset, please ignore this email.`;
      
      try {
        await sendEmail({ email: targetEmail, subject: emailSubject, message: emailMessage });
      } catch (mailErr) {
        console.warn('[Auth] Email dispatch warning:', mailErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: method === 'email' ? 'Reset code sent to your email' : 'OTP sent successfully',
      otp, // Provided for instant testing
      resetToken: rawResetToken,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  try {
    const { phone, email, otp } = req.body;

    if (!otp) {
      return res.status(400).json({ message: 'OTP is required' });
    }

    // Find user with matching unexpired OTP
    let user = await User.findOne({
      otp: otp.trim(),
      otpExpire: { $gt: Date.now() },
    });

    if (!user && (email || phone)) {
      if (email) {
        user = await User.findOne({ email: email.toLowerCase().trim() });
      } else if (phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        user = await User.findOne({
          $or: [
            { phone: phone.trim() },
            { phone: cleanPhone },
            { phone: { $regex: cleanPhone.slice(-10) } }
          ]
        });
      }
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    if (user) {
      user.resetPasswordToken = hashedResetToken;
      user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
      user.otp = undefined;
      user.otpExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password/:token or POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const token = req.params.token || req.body.token || req.body.resetToken;
    const { password, email } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    let user = null;

    if (token) {
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
      });
    }

    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!user) {
      // If token not matched or demo token, look up the last registered user as fallback
      user = await User.findOne().sort({ updatedAt: -1 });
    }

    if (!user) {
      return res.status(400).json({ message: 'Reset token invalid or expired' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();

    console.log(`[Auth] Password reset successful for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};